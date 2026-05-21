import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";

const ALLOWED_ROLES = ["parent", "committee", "teacher", "school_staff", "admin"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: targetUserId } = await params;
  const ROUTE = `/api/admin/users/${targetUserId}/role`;

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Přiřazení rolí vyžaduje roli administrátora", 403);
    }

    const body = await req.json() as { role?: string; tenantId?: string; schoolId?: string; action?: "assign" | "revoke" };

    if (!body.role || !ALLOWED_ROLES.includes(body.role)) {
      throw new AppError("VALIDATION_ERROR", `Role musí být jedna z: ${ALLOWED_ROLES.join(", ")}`, 400);
    }
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }

    const action = body.action ?? "assign";

    if (action === "revoke" && body.role === "admin") {
      // Block last-admin removal
      const adminCount = await db.userRole.count({
        where: { role: "admin", tenantId: body.tenantId, revokedAt: null },
      });
      if (adminCount <= 1) {
        throw new AppError("VALIDATION_ERROR", "Nelze odebrat posledního administrátora", 400);
      }
    }

    if (action === "assign") {
      await db.userRole.create({
        data: {
          userId: targetUserId,
          tenantId: body.tenantId,
          schoolId: body.schoolId ?? null,
          role: body.role,
          assignedBy: actor.id,
        },
      });
    } else {
      await db.userRole.updateMany({
        where: { userId: targetUserId, tenantId: body.tenantId, role: body.role, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: actor.id,
      action: `role.${action}ed`,
      entityType: "user_role",
      entityId: targetUserId,
      metadata: { role: body.role, targetUserId },
      requestId,
    });

    awardBadgesForUser(targetUserId).catch(() => {});

    logger.info("users/role: role updated", {
      request_id: requestId,
      route: ROUTE,
      action,
      role: body.role,
      target_user_id: targetUserId,
    });

    return NextResponse.json({ success: true, action, role: body.role }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("users/role: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("users/role: unexpected error", {
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
