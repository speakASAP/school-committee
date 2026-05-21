import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/auth/me";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { tenantId: true, schoolId: true, approvalStatus: true, rejectionReason: true, onboardingStatus: true },
    });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
        tenantId: profile?.tenantId ?? null,
        schoolId: profile?.schoolId ?? null,
        approvalStatus: profile?.approvalStatus ?? "pending",
        rejectionReason: profile?.rejectionReason ?? null,
        onboardingStatus: profile?.onboardingStatus ?? null,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("me: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("me: unexpected error", {
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
