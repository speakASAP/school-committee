import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: paymentIntentId } = await params;
  const ROUTE = `/api/admin/payments/${paymentIntentId}/confirm`;

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Potvrzení platby vyžaduje roli výboru nebo administrátora", 403);
    }

    const body = await req.json() as { reference?: string; tenantId?: string };

    const tenantId = body.tenantId || process.env.DEFAULT_TENANT_ID || process.env.DEFAULT_SCHOOL_ID;
    if (!tenantId) {
      throw new AppError("INTERNAL_ERROR", "Výchozí ID nájemce není nakonfigurováno", 500);
    }
    const reference = body.reference?.trim() || "manual";

    const pi = await db.paymentIntent.findUnique({ where: { id: paymentIntentId } });
    if (!pi) throw new AppError("NOT_FOUND", "Platební záměr nenalezen", 404);

    // Payment records are immutable once paid
    if (pi.status === "paid") {
      throw new AppError("CONFLICT", "Platba je již potvrzena", 409);
    }

    const updated = await db.paymentIntent.update({
      where: { id: paymentIntentId },
      data: { status: "paid", paidAt: new Date() },
    });

    // Record reconciliation event
    await db.paymentReconciliationEvent.create({
      data: {
        paymentIntentId,
        source: "manual",
        amountCzk: pi.amountCzk,
        variableSymbol: pi.variableSymbol,
        rawReference: reference,
        createdBy: actor.id,
      },
    });

    await writeAuditEvent({
      tenantId,
      schoolId: pi.schoolId,
      actorUserId: actor.id,
      action: "payment.confirmed",
      entityType: "payment_intent",
      entityId: paymentIntentId,
      metadata: { reference, amountCzk: pi.amountCzk },
      requestId,
    });

    logger.info("payments/confirm: payment confirmed", {
      request_id: requestId,
      route: ROUTE,
      payment_intent_id: paymentIntentId,
    });

    return NextResponse.json({ id: updated.id, status: updated.status }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("payments/confirm: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("payments/confirm: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
