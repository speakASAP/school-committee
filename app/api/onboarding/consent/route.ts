import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { upsertProfile } from "@/lib/db/profiles";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import type { RecordConsentRequest } from "@/types/onboarding";

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

    // Mark profile onboarding as complete
    await upsertProfile(user.id, {
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      onboardingStatus: "complete",
    });

    return NextResponse.json({ recorded: true, timestamp }, { status: 200 });
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
