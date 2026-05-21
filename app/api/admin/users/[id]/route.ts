import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { setUserActive, deleteUserFromApp } from "@/lib/db/users";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: targetUserId } = await params;
  const ROUTE = `/api/admin/users/${targetUserId}`;

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Tato akce vyžaduje roli administrátora", 403);
    }

    const body = await req.json() as { action?: string; tenantId?: string; schoolId?: string };

    if (!body.action || !["activate", "deactivate"].includes(body.action)) {
      throw new AppError("VALIDATION_ERROR", "Akce musí být 'activate' nebo 'deactivate'", 400);
    }
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }

    const isActive = body.action === "activate";
    await setUserActive(targetUserId, body.tenantId, isActive);

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: actor.id,
      action: `user.${body.action}d`,
      entityType: "profile",
      entityId: targetUserId,
      metadata: { isActive, targetUserId },
      requestId,
    });

    logger.info("users PATCH: user status updated", {
      request_id: requestId,
      route: ROUTE,
      action: body.action,
      target_user_id: targetUserId,
    });

    return NextResponse.json({ success: true, userId: targetUserId, isActive }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("users PATCH: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("users PATCH: unexpected error", {
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: targetUserId } = await params;
  const ROUTE = `/api/admin/users/${targetUserId}`;

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Tato akce vyžaduje roli administrátora", 403);
    }

    const body = await req.json() as { tenantId?: string; schoolId?: string };

    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }

    await deleteUserFromApp(targetUserId, body.tenantId);

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: actor.id,
      action: "user.removed_from_app",
      entityType: "profile",
      entityId: targetUserId,
      metadata: { targetUserId },
      requestId,
    });

    logger.info("users DELETE: user removed from app", {
      request_id: requestId,
      route: ROUTE,
      target_user_id: targetUserId,
    });

    return NextResponse.json({ success: true, userId: targetUserId }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("users DELETE: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("users DELETE: unexpected error", {
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
