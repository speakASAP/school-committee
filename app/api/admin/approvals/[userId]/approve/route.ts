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
  const ROUTE = `/api/admin/approvals/${targetUserId}/approve`;

  try {
    const actor = await getCurrentUser(requestId);
    requireRole(actor, ["school_staff", "committee", "admin"]);

    const body = await req.json() as { tenantId?: string; schoolId?: string };
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }

    const profile = await db.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) {
      throw new AppError("NOT_FOUND", "Profil uživatele nenalezen", 404);
    }
    if (profile.approvalStatus === "approved") {
      throw new AppError("CONFLICT", "Uživatel je již schválen", 409);
    }

    await db.$transaction(async (tx) => {
      await tx.profile.update({
        where: { userId: targetUserId },
        data: {
          approvalStatus: "approved",
          approvedBy: actor.id,
          approvedAt: new Date(),
          rejectionReason: null,
        },
      });

      // Assign parent role if not already assigned
      const existingRole = await tx.userRole.findFirst({
        where: { userId: targetUserId, tenantId: body.tenantId!, role: "parent", revokedAt: null },
      });
      if (!existingRole) {
        await tx.userRole.create({
          data: {
            userId: targetUserId,
            tenantId: body.tenantId!,
            schoolId: body.schoolId ?? profile.schoolId,
            role: "parent",
            assignedBy: actor.id,
          },
        });
      }

      await writeAuditEvent(
        {
          tenantId: body.tenantId!,
          schoolId: body.schoolId ?? profile.schoolId,
          actorUserId: actor.id,
          action: "user_approved",
          entityType: "profile",
          entityId: targetUserId,
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
          type: "user_approval_approved",
          recipientUserId: targetUserId,
          payload: {},
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => undefined);
    }

    logger.info("admin/approvals/approve: user approved", {
      request_id: requestId,
      route: ROUTE,
      target_user_id: targetUserId,
      actor_id: actor.id,
    });

    return NextResponse.json({ success: true, approvalStatus: "approved" }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/approvals/approve: error", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/approvals/approve: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
