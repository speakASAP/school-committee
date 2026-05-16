import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { getProfile } from "@/lib/db/profiles";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import type { ChildInput } from "@/types/onboarding";

const ROUTE = "/api/profile/children";

export async function PUT(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    const profile = await getProfile(user.id);

    const body = (await req.json()) as { children: ChildInput[] };

    if (!Array.isArray(body.children) || body.children.length === 0) {
      throw new AppError("VALIDATION_ERROR", "At least one child is required", 400);
    }

    for (const child of body.children) {
      if (!child.firstName?.trim()) {
        throw new AppError("VALIDATION_ERROR", "Each child must have a firstName", 400);
      }
      if (!child.lastName?.trim()) {
        throw new AppError("VALIDATION_ERROR", "Each child must have a lastName", 400);
      }
      if (!child.classId) {
        throw new AppError("VALIDATION_ERROR", "Each child must have a classId", 400);
      }
    }

    await db.child.deleteMany({ where: { parentUserId: user.id } });

    const children = await db.$transaction(
      body.children.map((child) =>
        db.child.create({
          data: {
            parentUserId: user.id,
            schoolId: profile.schoolId,
            classId: child.classId,
            firstName: child.firstName.trim(),
            lastName: child.lastName.trim(),
            notes: child.notes?.trim() ?? null,
            parentConsent: true,
          },
        }),
      ),
    );

    await writeAuditEvent({
      tenantId: profile.tenantId,
      schoolId: profile.schoolId,
      actorUserId: user.id,
      action: "profile.children_updated",
      entityType: "child",
      entityId: user.id,
      metadata: { count: children.length },
      requestId,
    });

    logger.info("profile/children PUT: children updated", {
      request_id: requestId,
      route: ROUTE,
      user_id: user.id,
      count: children.length,
    });

    return NextResponse.json({
      children: children.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, classId: c.classId })),
    });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("profile/children PUT: error", { request_id: requestId, route: ROUTE, error_code: err.code });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("profile/children PUT: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
