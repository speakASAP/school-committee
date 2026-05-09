import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

const ALLOWED_ROLES = ["parent", "committee", "teacher", "school_staff", "admin"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Role assignment requires admin role", 403);
    }

    const { id: targetUserId } = await params;
    const body = await req.json() as { role?: string; tenantId?: string; schoolId?: string; action?: "assign" | "revoke" };

    if (!body.role || !ALLOWED_ROLES.includes(body.role)) {
      throw new AppError("VALIDATION_ERROR", `role must be one of: ${ALLOWED_ROLES.join(", ")}`, 400);
    }
    if (!body.tenantId) {
      throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    }

    const action = body.action ?? "assign";

    if (action === "revoke" && body.role === "admin") {
      // Block last-admin removal
      const adminCount = await db.userRole.count({
        where: { role: "admin", tenantId: body.tenantId, revokedAt: null },
      });
      if (adminCount <= 1) {
        throw new AppError("VALIDATION_ERROR", "Cannot remove the last admin", 400);
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

    return NextResponse.json({ success: true, action, role: body.role }, { status: 200 });
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
