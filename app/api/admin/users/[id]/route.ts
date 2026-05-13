import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { setUserActive, deleteUserFromApp } from "@/lib/db/users";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Admin role required", 403);
    }

    const { id: targetUserId } = await params;
    const body = await req.json() as { action?: string; tenantId?: string; schoolId?: string };

    if (!body.action || !["activate", "deactivate"].includes(body.action)) {
      throw new AppError("VALIDATION_ERROR", "action must be 'activate' or 'deactivate'", 400);
    }
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
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

    return NextResponse.json({ success: true, userId: targetUserId, isActive }, { status: 200 });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Admin role required", 403);
    }

    const { id: targetUserId } = await params;
    const body = await req.json() as { tenantId?: string; schoolId?: string };

    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
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

    return NextResponse.json({ success: true, userId: targetUserId }, { status: 200 });
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
