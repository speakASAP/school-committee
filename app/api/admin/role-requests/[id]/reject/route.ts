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
  const ROUTE = `/api/admin/role-requests/${id}/reject`;

  try {
    const actor = await getCurrentUser(requestId);
    requireRole(actor, ["school_staff", "admin"]);

    const body = await req.json() as { tenantId?: string; schoolId?: string; reason?: string };
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }
    if (!body.reason?.trim()) {
      throw new AppError("VALIDATION_ERROR", "Důvod zamítnutí je povinný", 400);
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
        data: {
          status: "rejected",
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          rejectionReason: body.reason!.trim(),
        },
      });

      await writeAuditEvent(
        {
          tenantId: body.tenantId!,
          schoolId: body.schoolId,
          actorUserId: actor.id,
          action: "role_upgrade_rejected",
          entityType: "role_upgrade_request",
          entityId: id,
          metadata: { reason: body.reason, targetUserId: upgradeRequest.userId },
          requestId,
        },
        tx,
      );
    });

    logger.info("admin/role-requests/reject: rejected", {
      request_id: requestId,
      route: ROUTE,
      upgrade_request_id: id,
      actor_id: actor.id,
    });

    return NextResponse.json({ success: true, status: "rejected" }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/role-requests/reject: error", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/role-requests/reject: unexpected error", {
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
