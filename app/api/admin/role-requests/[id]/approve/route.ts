import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireRole } from "@/lib/auth/require-role";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  const ROUTE = `/api/admin/role-requests/${id}/approve`;

  try {
    const actor = await getCurrentUser(requestId);
    requireRole(actor, ["school_staff", "committee", "admin"]);

    const body = await req.json() as { tenantId?: string; schoolId?: string };
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }

    const upgradeRequest = await db.roleUpgradeRequest.findUnique({ where: { id } });
    if (!upgradeRequest) {
      throw new AppError("NOT_FOUND", "Žádost o změnu role nenalezena", 404);
    }
    if (upgradeRequest.status !== "pending") {
      throw new AppError("CONFLICT", "Žádost již není ve stavu čekající", 409);
    }

    await db.$transaction(async (tx) => {
      await tx.roleUpgradeRequest.update({
        where: { id },
        data: { status: "approved", reviewedBy: actor.id, reviewedAt: new Date() },
      });

      const existingRole = await tx.userRole.findFirst({
        where: { userId: upgradeRequest.userId, tenantId: body.tenantId!, role: upgradeRequest.requestedRole, revokedAt: null },
      });
      if (!existingRole) {
        await tx.userRole.create({
          data: {
            userId: upgradeRequest.userId,
            tenantId: body.tenantId!,
            schoolId: body.schoolId ?? null,
            role: upgradeRequest.requestedRole,
            assignedBy: actor.id,
          },
        });
      }

      await writeAuditEvent(
        {
          tenantId: body.tenantId!,
          schoolId: body.schoolId,
          actorUserId: actor.id,
          action: "role_upgrade_approved",
          entityType: "role_upgrade_request",
          entityId: id,
          metadata: { requestedRole: upgradeRequest.requestedRole, targetUserId: upgradeRequest.userId },
          requestId,
        },
        tx,
      );
    });

    logger.info("admin/role-requests/approve: approved", {
      request_id: requestId,
      route: ROUTE,
      upgrade_request_id: id,
      actor_id: actor.id,
    });

    return NextResponse.json({ success: true, status: "approved" }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/role-requests/approve: error", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/role-requests/approve: unexpected error", {
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
