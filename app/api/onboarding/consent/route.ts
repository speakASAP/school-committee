import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import type { RecordConsentRequest } from "@/types/onboarding";
import { setOnboardingStatusCookie } from "@/lib/auth/session";

const ROUTE = "/api/onboarding/consent";

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "";
const DEFAULT_SCHOOL_ID = process.env.DEFAULT_SCHOOL_ID ?? "";

async function getAutoApprove(schoolId: string): Promise<boolean> {
  try {
    const s = await db.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: "auto_approve_users" } },
    });
    return s?.value === "true";
  } catch {
    return false;
  }
}

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
  }
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);

    const body = (await req.json()) as RecordConsentRequest;

    const profile = await import("@/lib/db/profiles").then((m) => m.getProfile(user.id).catch(() => null));
    const tenantId = profile?.tenantId ?? DEFAULT_TENANT_ID;
    const schoolId = profile?.schoolId ?? DEFAULT_SCHOOL_ID;

    if (!tenantId || !schoolId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce a školy nejsou nakonfigurována", 500);
    }

    const { consent } = body;

    if (!consent) {
      throw new AppError("VALIDATION_ERROR", "Souhlas je povinný", 400);
    }
    if (!consent.termsAccepted) {
      throw new AppError("VALIDATION_ERROR", "Musíte přijmout podmínky používání", 400);
    }
    if (!consent.privacyPolicyAccepted) {
      throw new AppError("VALIDATION_ERROR", "Musíte přijmout zásady ochrany osobních údajů", 400);
    }
    if (!consent.parentCommitteeParticipation) {
      throw new AppError("VALIDATION_ERROR", "Souhlas s účastí v rodičovském výboru je povinný", 400);
    }
    if (!consent.version) {
      throw new AppError("VALIDATION_ERROR", "Verze souhlasu je povinná", 400);
    }

    const timestamp = new Date().toISOString();
    const autoApprove = await getAutoApprove(schoolId);

    await writeAuditEvent({
      tenantId,
      schoolId,
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
        autoApproved: autoApprove,
      },
      requestId,
    });

    if (autoApprove) {
      // Auto-approve: set approved immediately and grant parent role in one transaction
      await db.$transaction(async (tx) => {
        await tx.profile.update({
          where: { userId: user.id },
          data: {
            onboardingStatus: "complete",
            approvalStatus: "approved",
            approvedAt: new Date(),
          },
        });

        const existingRole = await tx.userRole.findFirst({
          where: { userId: user.id, tenantId, role: "parent", revokedAt: null },
        });
        if (!existingRole) {
          await tx.userRole.create({
            data: { userId: user.id, tenantId, schoolId, role: "parent", assignedBy: user.id },
          });
        }
      });

      await setOnboardingStatusCookie("complete");

      logger.info("onboarding/consent: auto-approved", {
        request_id: requestId,
        route: ROUTE,
        user_id: user.id,
      });

      return NextResponse.json({ recorded: true, timestamp, approvalStatus: "approved" }, { status: 200 });
    }

    // Normal flow: set pending, notify staff
    await db.profile.update({
      where: { userId: user.id },
      data: { onboardingStatus: "consent_complete", approvalStatus: "pending" },
    });
    await setOnboardingStatusCookie("consent_complete");

    void notifyStaffPendingApproval(user.id, user.email, user.email, requestId);

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
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
