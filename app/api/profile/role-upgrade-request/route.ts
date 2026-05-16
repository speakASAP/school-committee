import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

const ROUTE = "/api/profile/role-upgrade-request";
const ALLOWED_UPGRADE_ROLES = ["teacher", "school_staff"];

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const body = await req.json() as { requestedRole?: string; reason?: string; tenantId?: string; schoolId?: string };

    if (!body.requestedRole || !ALLOWED_UPGRADE_ROLES.includes(body.requestedRole)) {
      throw new AppError("VALIDATION_ERROR", `requestedRole must be one of: ${ALLOWED_UPGRADE_ROLES.join(", ")}`, 400);
    }
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    }
    if (!body.schoolId) {
      throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    }

    // Block duplicate pending request
    const existing = await db.roleUpgradeRequest.findFirst({
      where: { userId: user.id, requestedRole: body.requestedRole, status: "pending" },
    });
    if (existing) {
      throw new AppError("CONFLICT", "A pending request for this role already exists", 409);
    }

    const request = await db.roleUpgradeRequest.create({
      data: {
        userId: user.id,
        tenantId: body.tenantId,
        schoolId: body.schoolId,
        requestedRole: body.requestedRole,
        reason: body.reason?.trim() ?? null,
        status: "pending",
      },
    });

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: user.id,
      action: "role_upgrade_requested",
      entityType: "role_upgrade_request",
      entityId: request.id,
      metadata: { requestedRole: body.requestedRole },
      requestId,
    });

    // Notify staff (fire-and-forget)
    const notificationUrl = process.env.NOTIFICATION_SERVICE_BASE_URL;
    if (notificationUrl) {
      fetch(`${notificationUrl}/api/notifications`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "role_upgrade_requested",
          recipientRole: "school_staff",
          payload: { userId: user.id, requestedRole: body.requestedRole },
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => undefined);
    }

    logger.info("profile/role-upgrade-request: request created", {
      request_id: requestId,
      route: ROUTE,
      user_id: user.id,
      requested_role: body.requestedRole,
    });

    return NextResponse.json({ id: request.id, status: "pending" }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("profile/role-upgrade-request: error", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("profile/role-upgrade-request: unexpected error", {
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
