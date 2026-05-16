import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireRole } from "@/lib/auth/require-role";

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { userId: targetUserId } = await params;
  const ROUTE = `/api/admin/approvals/${targetUserId}/reject`;

  try {
    const actor = await getCurrentUser(requestId);
    requireRole(actor, ["school_staff", "admin"]);

    const body = await req.json() as { tenantId?: string; schoolId?: string; reason?: string };
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    }
    if (!body.reason?.trim()) {
      throw new AppError("VALIDATION_ERROR", "A rejection reason is required", 400);
    }

    const profile = await db.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) {
      throw new AppError("NOT_FOUND", "User profile not found", 404);
    }

    await db.$transaction(async (tx) => {
      await tx.profile.update({
        where: { userId: targetUserId },
        data: {
          approvalStatus: "rejected",
          rejectionReason: body.reason!.trim(),
        },
      });

      await writeAuditEvent(
        {
          tenantId: body.tenantId!,
          schoolId: body.schoolId ?? profile.schoolId,
          actorUserId: actor.id,
          action: "user_rejected",
          entityType: "profile",
          entityId: targetUserId,
          metadata: { reason: body.reason },
          requestId,
        },
        tx,
      );
    });

    // Notify user (fire-and-forget)
    const notificationUrl = process.env.NOTIFICATION_SERVICE_BASE_URL;
    if (notificationUrl) {
      fetch(`${notificationUrl}/api/notifications`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "user_approval_rejected",
          recipientUserId: targetUserId,
          payload: { reason: body.reason },
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => undefined);
    }

    logger.info("admin/approvals/reject: user rejected", {
      request_id: requestId,
      route: ROUTE,
      target_user_id: targetUserId,
      actor_id: actor.id,
    });

    return NextResponse.json({ success: true, approvalStatus: "rejected" }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/approvals/reject: error", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/approvals/reject: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
