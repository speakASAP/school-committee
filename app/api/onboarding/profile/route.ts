import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { upsertProfile, getProfile } from "@/lib/db/profiles";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError, ForbiddenError } from "@/types/errors";
import type { OnboardingProfileRequest } from "@/types/onboarding";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";
import { setOnboardingStatusCookie } from "@/lib/auth/session";

const ROUTE = "/api/onboarding/profile";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const body = (await req.json()) as OnboardingProfileRequest;

    if (!body.tenantId || !body.schoolId || !body.firstName || !body.lastName) {
      throw new AppError("VALIDATION_ERROR", "firstName, lastName, tenantId, schoolId are required", 400);
    }
    if (!body.participationType) {
      throw new AppError("VALIDATION_ERROR", "participationType is required", 400);
    }
    if (!["financial", "labor", "mixed"].includes(body.participationType)) {
      throw new AppError("VALIDATION_ERROR", "participationType must be financial, labor, or mixed", 400);
    }
    if (!body.language) {
      throw new AppError("VALIDATION_ERROR", "language is required", 400);
    }
    if (!["cs", "en", "ru", "uk"].includes(body.language)) {
      throw new AppError("VALIDATION_ERROR", "language must be cs, en, ru, or uk", 400);
    }

    // Block unverified users — auth-microservice validates token; if getCurrentUser succeeds, token is valid.
    // Platform-level: check if existing profile has onboarding_status = complete → redirect
    const existing = await getProfile(user.id).catch(() => null);
    if (existing?.onboardingStatus === "complete") {
      throw new ForbiddenError("Onboarding already complete");
    }

    const profile = await upsertProfile(user.id, {
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      language: body.language,
      participationType: body.participationType,
      onboardingStatus: "profile_complete",
    });

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: user.id,
      action: "onboarding.profile_created",
      entityType: "profile",
      entityId: user.id,
      requestId,
    });

    awardBadgesForUser(user.id).catch(() => {});
    await setOnboardingStatusCookie("profile_complete");

    logger.info("onboarding/profile: profile created", {
      request_id: requestId,
      route: ROUTE,
      user_id: user.id,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("onboarding/profile: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("onboarding/profile: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
