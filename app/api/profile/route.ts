import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { upsertProfile, getProfile } from "@/lib/db/profiles";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError, NotFoundError } from "@/types/errors";

const ROUTE = "/api/profile";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const [profile, children] = await Promise.all([
      getProfile(user.id),
      db.child.findMany({
        where: { parentUserId: user.id },
        include: { class: { select: { id: true, name: true, grade: true, schoolYear: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      profile: {
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? null,
        language: profile.language,
        participationType: profile.participationType,
        approvalStatus: profile.approvalStatus,
        rejectionReason: profile.rejectionReason ?? null,
        schoolId: profile.schoolId,
        tenantId: profile.tenantId,
      },
      children: children.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        notes: c.notes ?? null,
        classId: c.classId,
        className: c.class.name,
        grade: c.class.grade,
        schoolYear: c.class.schoolYear,
      })),
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(toErrorResponse(new AppError("NOT_FOUND", "Profile not found", 404), requestId), { status: 404 });
    }
    if (err instanceof AppError) {
      logger.error("profile GET: error", { request_id: requestId, route: ROUTE, error_code: err.code });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("profile GET: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const body = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      language?: string;
      participationType?: string;
    };

    if (body.firstName !== undefined && !body.firstName.trim()) {
      throw new AppError("VALIDATION_ERROR", "firstName cannot be empty", 400);
    }
    if (body.lastName !== undefined && !body.lastName.trim()) {
      throw new AppError("VALIDATION_ERROR", "lastName cannot be empty", 400);
    }
    if (body.language !== undefined && !["cs", "en", "ru", "uk"].includes(body.language)) {
      throw new AppError("VALIDATION_ERROR", "language must be cs, en, ru, or uk", 400);
    }
    if (body.participationType !== undefined && !["financial", "labor", "mixed"].includes(body.participationType)) {
      throw new AppError("VALIDATION_ERROR", "participationType must be financial, labor, or mixed", 400);
    }

    const existing = await getProfile(user.id);

    // Editing profile while rejected → resubmit for approval
    const approvalReset = existing.approvalStatus === "rejected"
      ? { approvalStatus: "pending", rejectionReason: null }
      : {};

    const profile = await upsertProfile(user.id, {
      ...(body.firstName ? { firstName: body.firstName.trim() } : {}),
      ...(body.lastName ? { lastName: body.lastName.trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
      ...(body.language ? { language: body.language } : {}),
      ...(body.participationType ? { participationType: body.participationType } : {}),
      ...approvalReset,
    });

    await writeAuditEvent({
      tenantId: existing.tenantId,
      schoolId: existing.schoolId,
      actorUserId: user.id,
      action: approvalReset.approvalStatus ? "profile_resubmitted" : "profile.updated",
      entityType: "profile",
      entityId: user.id,
      requestId,
    });

    if (approvalReset.approvalStatus) {
      // Fire-and-forget: notify staff of resubmission
      void (async () => {
        try {
          const base = process.env.NOTIFICATION_SERVICE_BASE_URL;
          if (!base) return;
          await fetch(`${base}/api/notifications`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              type: "new_user_pending_approval",
              recipientRole: "school_staff",
              payload: { userId: user.id, name: `${profile.firstName} ${profile.lastName}`, email: user.email },
            }),
          });
        } catch { /* non-fatal */ }
      })();
    }

    logger.info("profile PATCH: profile updated", { request_id: requestId, route: ROUTE, user_id: user.id });

    return NextResponse.json({
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? null,
        language: profile.language,
        participationType: profile.participationType,
        approvalStatus: profile.approvalStatus,
        rejectionReason: profile.rejectionReason ?? null,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("profile PATCH: error", { request_id: requestId, route: ROUTE, error_code: err.code });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("profile PATCH: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
