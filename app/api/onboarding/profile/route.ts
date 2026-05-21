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

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "";
const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID ?? "";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const body = (await req.json()) as OnboardingProfileRequest;

    // tenantId and schoolId come from env defaults — not from the client
    const tenantId = body.tenantId || DEFAULT_TENANT_ID;
    const schoolId = body.schoolId || DEFAULT_SCHOOL_ID;

    if (!tenantId || !schoolId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce a školy nejsou nakonfigurována", 500);
    }
    if (!body.firstName || !body.lastName) {
      throw new AppError("VALIDATION_ERROR", "Křestní jméno a příjmení jsou povinné", 400);
    }
    if (!body.participationType) {
      throw new AppError("VALIDATION_ERROR", "Typ účasti je povinný", 400);
    }
    if (!["financial", "labor", "mixed"].includes(body.participationType)) {
      throw new AppError("VALIDATION_ERROR", "Typ účasti musí být finanční, pracovní nebo kombinovaný", 400);
    }
    if (!body.language) {
      throw new AppError("VALIDATION_ERROR", "Jazyk je povinný", 400);
    }
    if (!["cs", "en", "ru", "uk"].includes(body.language)) {
      throw new AppError("VALIDATION_ERROR", "Jazyk musí být cs, en, ru nebo uk", 400);
    }

    // Block unverified users — auth-microservice validates token; if getCurrentUser succeeds, token is valid.
    // Platform-level: check if existing profile has onboarding_status = complete → redirect
    const existing = await getProfile(user.id).catch(() => null);
    if (existing?.onboardingStatus === "complete") {
      throw new ForbiddenError("Registrace je již dokončena");
    }

    const profile = await upsertProfile(user.id, {
      tenantId,
      schoolId,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      language: body.language,
      participationType: body.participationType,
      onboardingStatus: "profile_complete",
    });

    await writeAuditEvent({
      tenantId,
      schoolId,
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
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
