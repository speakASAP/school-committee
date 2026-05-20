import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { upsertProfile } from "@/lib/db/profiles";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import type { RecordConsentRequest } from "@/types/onboarding";
import { setOnboardingStatusCookie } from "@/lib/auth/session";

const ROUTE = "/api/onboarding/consent";

async function notifyStaffPendingApproval(
  userId: string,
  name: string,
  email: string,
  requestId: string,
): Promise<void> {
  const notificationUrl = process.env.NOTIFICATION_SERVICE_BASE_URL;
  if (!notificationUrl) return;

  try {
    await fetch(`${notificationUrl}/api/notifications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "new_user_pending_approval",
        recipientRole: "school_staff",
        payload: { userId, name, email },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    logger.error("onboarding/consent: failed to notify staff", {
      request_id: requestId,
      route: ROUTE,
      error_message: err instanceof Error ? err.message : String(err),
    });
    // Non-fatal — approval can still happen manually
  }
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const body = (await req.json()) as RecordConsentRequest;

    if (!body.tenantId || !body.schoolId) {
      throw new AppError("VALIDATION_ERROR", "tenantId and schoolId are required", 400);
    }

    const { consent } = body;

    if (!consent) {
      throw new AppError("VALIDATION_ERROR", "consent is required", 400);
    }
    if (!consent.termsAccepted) {
      throw new AppError("VALIDATION_ERROR", "Terms must be accepted", 400);
    }
    if (!consent.privacyPolicyAccepted) {
      throw new AppError("VALIDATION_ERROR", "Privacy policy must be accepted", 400);
    }
    if (!consent.parentCommitteeParticipation) {
      throw new AppError("VALIDATION_ERROR", "Parent committee participation consent is required", 400);
    }
    if (!consent.version) {
      throw new AppError("VALIDATION_ERROR", "Consent version is required", 400);
    }

    const timestamp = new Date().toISOString();

    await writeAuditEvent({
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: user.id,
      action: "onboarding.consent_recorded",
      entityType: "profile",
      entityId: user.id,
      metadata: {
        termsAccepted: consent.termsAccepted,
        privacyPolicyAccepted: consent.privacyPolicyAccepted,
        parentCommitteeParticipation: consent.parentCommitteeParticipation,
        version: consent.version,
        timestamp,
      },
      requestId,
    });

    await upsertProfile(user.id, {
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      onboardingStatus: "consent_complete",
      approvalStatus: "pending",
    });
    await setOnboardingStatusCookie("consent_complete");

    // Fire-and-forget notification to school_staff
    void notifyStaffPendingApproval(
      user.id,
      user.email,
      user.email,
      requestId,
    );

    logger.info("onboarding/consent: consent recorded, approval pending", {
      request_id: requestId,
      route: ROUTE,
      user_id: user.id,
    });

    return NextResponse.json({ recorded: true, timestamp, approvalStatus: "pending" }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("onboarding/consent: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("onboarding/consent: unexpected error", {
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
