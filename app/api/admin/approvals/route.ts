import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireRole } from "@/lib/auth/require-role";

const ROUTE = "/api/admin/approvals";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);
    requireRole(actor, ["school_staff", "admin"]);

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const schoolId = searchParams.get("schoolId") ?? undefined;
    const statusFilter = searchParams.get("status") ?? "pending";

    if (!tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }

    const profiles = await db.profile.findMany({
      where: {
        tenantId,
        onboardingStatus: "complete",
        approvalStatus: statusFilter,
        ...(schoolId ? { schoolId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    const userIds = profiles.map((p) => p.userId);

    const childrenByUser = await db.child.findMany({
      where: { parentUserId: { in: userIds } },
      include: { class: { select: { name: true, grade: true } } },
    });

    const childrenMap = new Map<string, typeof childrenByUser>();
    for (const child of childrenByUser) {
      const existing = childrenMap.get(child.parentUserId) ?? [];
      existing.push(child);
      childrenMap.set(child.parentUserId, existing);
    }

    const users = profiles.map((p) => ({
      userId: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      schoolId: p.schoolId,
      approvalStatus: p.approvalStatus,
      rejectionReason: p.rejectionReason,
      approvedBy: p.approvedBy,
      approvedAt: p.approvedAt,
      createdAt: p.createdAt,
      children: (childrenMap.get(p.userId) ?? []).map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        className: c.class.name,
        grade: c.class.grade,
        notes: c.notes,
      })),
    }));

    return NextResponse.json({ users }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/approvals GET: error", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/approvals GET: unexpected error", {
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
