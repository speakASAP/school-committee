import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { getProfile } from "@/lib/db/profiles";
import { writeAuditEvent } from "@/lib/db/audit";
import { getAvatarUrl } from "@/lib/storage/media-urls";
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

    const avatarUrl = await getAvatarUrl(profile.avatarFileKey ?? null, requestId);

    return NextResponse.json({
      profile: {
        userId: profile.userId,
        titleBefore: profile.titleBefore ?? null,
        titleAfter: profile.titleAfter ?? null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        bio: profile.bio ?? null,
        phone: profile.phone ?? null,
        language: profile.language,
        participationType: profile.participationType,
        approvalStatus: profile.approvalStatus,
        rejectionReason: profile.rejectionReason ?? null,
        schoolId: profile.schoolId,
        tenantId: profile.tenantId,
        avatarUrl,
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
      return NextResponse.json(toErrorResponse(new AppError("NOT_FOUND", "Profil nenalezen", 404), requestId), { status: 404 });
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
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const body = (await req.json()) as {
      titleBefore?: string;
      titleAfter?: string;
      firstName?: string;
      lastName?: string;
      bio?: string;
      phone?: string;
      language?: string;
      participationType?: string;
    };

    if (body.firstName !== undefined && !body.firstName.trim()) {
      throw new AppError("VALIDATION_ERROR", "Křestní jméno nesmí být prázdné", 400);
    }
    if (body.lastName !== undefined && !body.lastName.trim()) {
      throw new AppError("VALIDATION_ERROR", "Příjmení nesmí být prázdné", 400);
    }
    if (body.language !== undefined && !["cs", "en", "ru", "uk"].includes(body.language)) {
      throw new AppError("VALIDATION_ERROR", "Jazyk musí být cs, en, ru nebo uk", 400);
    }
    if (body.participationType !== undefined && !["financial", "labor", "mixed"].includes(body.participationType)) {
      throw new AppError("VALIDATION_ERROR", "Typ účasti musí být finanční, pracovní nebo kombinovaný", 400);
    }
    if (body.bio !== undefined && body.bio.length > 1000) {
      throw new AppError("VALIDATION_ERROR", "Bio nesmí překročit 1000 znaků", 400);
    }

    const existing = await getProfile(user.id);

    // Editing profile while rejected → resubmit for approval
    const approvalReset = existing.approvalStatus === "rejected"
      ? { approvalStatus: "pending", rejectionReason: null }
      : {};

    const profile = await db.profile.update({
      where: { userId: user.id },
      data: {
        ...(body.titleBefore !== undefined ? { titleBefore: body.titleBefore?.trim() || null } : {}),
        ...(body.titleAfter !== undefined ? { titleAfter: body.titleAfter?.trim() || null } : {}),
        ...(body.firstName ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName ? { lastName: body.lastName.trim() } : {}),
        ...(body.bio !== undefined ? { bio: body.bio?.trim() || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
        ...(body.language ? { language: body.language } : {}),
        ...(body.participationType ? { participationType: body.participationType } : {}),
        ...approvalReset,
      },
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
        titleBefore: profile.titleBefore ?? null,
        titleAfter: profile.titleAfter ?? null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        bio: profile.bio ?? null,
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
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
