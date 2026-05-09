import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Payment confirmation requires committee or admin role", 403);
    }

    const { id: paymentIntentId } = await params;
    const body = await req.json() as { reference?: string; tenantId?: string };

    if (!body.reference?.trim()) {
      throw new AppError("VALIDATION_ERROR", "Bank statement reference is required", 400);
    }
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    }

    const pi = await db.paymentIntent.findUnique({ where: { id: paymentIntentId } });
    if (!pi) throw new AppError("NOT_FOUND", "Payment intent not found", 404);

    // Payment records are immutable once paid
    if (pi.status === "paid") {
      throw new AppError("CONFLICT", "Payment is already confirmed", 409);
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
        rawReference: body.reference,
        createdBy: actor.id,
      },
    });

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: pi.schoolId,
      actorUserId: actor.id,
      action: "payment.confirmed",
      entityType: "payment_intent",
      entityId: paymentIntentId,
      metadata: { reference: body.reference, amountCzk: pi.amountCzk },
      requestId,
    });

    return NextResponse.json({ id: updated.id, status: updated.status }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
