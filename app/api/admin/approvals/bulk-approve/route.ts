import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireRole } from "@/lib/auth/require-role";

const ROUTE = "/api/admin/approvals/bulk-approve";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "";
const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID ?? "";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const actor = await getCurrentUser(requestId);
    requireRole(actor, ["school_staff", "admin"]);

    const pending = await db.profile.findMany({
      where: { approvalStatus: "pending", onboardingStatus: "complete" },
      select: { userId: true, schoolId: true },
    });

    if (pending.length === 0) {
      return NextResponse.json({ approved: 0 }, { status: 200 });
    }

    const tenantId = DEFAULT_TENANT_ID;
    const schoolId = DEFAULT_SCHOOL_ID;

    let approved = 0;
    for (const profile of pending) {
      await db.$transaction(async (tx) => {
        await tx.profile.update({
          where: { userId: profile.userId },
          data: { approvalStatus: "approved", approvedBy: actor.id, approvedAt: new Date(), rejectionReason: null },
        });

        const existingRole = await tx.userRole.findFirst({
          where: { userId: profile.userId, tenantId, role: "parent", revokedAt: null },
        });
        if (!existingRole) {
          await tx.userRole.create({
            data: { userId: profile.userId, tenantId, schoolId: profile.schoolId || schoolId, role: "parent", assignedBy: actor.id },
          });
        }

        await writeAuditEvent(
          { tenantId, schoolId: profile.schoolId || schoolId, actorUserId: actor.id, action: "user_approved", entityType: "profile", entityId: profile.userId, requestId },
          tx,
        );
      });
      approved++;

      // Notify (fire-and-forget)
      const notificationUrl = process.env.NOTIFICATION_SERVICE_BASE_URL;
      if (notificationUrl) {
        fetch(`${notificationUrl}/api/notifications`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "user_approval_approved", recipientUserId: profile.userId, payload: {} }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => undefined);
      }
    }

    logger.info("admin/approvals/bulk-approve: bulk approved", {
      request_id: requestId,
      route: ROUTE,
      count: approved,
      actor_id: actor.id,
    });

    return NextResponse.json({ approved }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
