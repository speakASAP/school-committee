import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { generateVariableSymbol } from "@/lib/payments/variable-symbol";
import { generateQrPayload } from "@/lib/payments/qr-generator";
import { createPaymentIntent } from "@/lib/db/payments";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import type { CreatePaymentQrRequest, CreatePaymentQrResponse } from "@/types/payments";

const ROUTE = "/api/payments/qr";

function getAccountConfig() {
  const iban = process.env.PAYMENT_ACCOUNT_IBAN;
  const accountNumber = process.env.PAYMENT_ACCOUNT_NUMBER;
  const bankCode = process.env.PAYMENT_BANK_CODE;

  if (!accountNumber || !bankCode) {
    throw new AppError("INTERNAL_ERROR", "Payment account not configured", 500);
  }
  return { iban, accountNumber, bankCode };
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const body = (await req.json()) as CreatePaymentQrRequest;

    if (!body.schoolId) {
      body.schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    }
    if (!body.schoolId) {
      throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    }

    let account: ReturnType<typeof getAccountConfig>;
    try {
      account = getAccountConfig();
    } catch (configErr) {
      if (configErr instanceof AppError) {
        logger.error("payments/qr: payment account not configured", {
          request_id: requestId,
          route: ROUTE,
          error_code: "MISCONFIGURATION",
          error_message: configErr.message,
        });
      }
      throw configErr;
    }

    const variableSymbol = generateVariableSymbol();

    // Expiry: 30 days from now
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const intent = await createPaymentIntent({
      schoolId: body.schoolId,
      userId: user.id,
      planId: body.planId,
      amountCzk: body.amountCzk,
      variableSymbol,
      message: body.message,
      expiresAt,
    });

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? intent.schoolId,
      schoolId: intent.schoolId,
      actorUserId: user.id,
      action: "payment_intent.created",
      entityType: "payment_intent",
      entityId: intent.id,
      requestId,
    });

    const qr = generateQrPayload({
      accountNumber: account.accountNumber,
      bankCode: account.bankCode,
      iban: account.iban,
      amountCzk: intent.amountCzk,
      variableSymbol: intent.variableSymbol,
      message: intent.message ?? undefined,
    });

    const response: CreatePaymentQrResponse = {
      paymentIntentId: intent.id,
      variableSymbol: intent.variableSymbol,
      amountCzk: intent.amountCzk,
      qrString: qr.qrString,
      expiresAt: expiresAt.toISOString(),
    };

    logger.info("payments/qr: payment intent created", {
      request_id: requestId,
      route: ROUTE,
      payment_intent_id: intent.id,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("payments/qr: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("payments/qr: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
