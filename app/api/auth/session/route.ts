import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies, setOnboardingStatusCookie } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, AppError } from "@/types/errors";
import { db } from "@/lib/db/client";
import { validateToken } from "@/lib/auth/validate-token";

const ROUTE = "/api/auth/session";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: { accessToken?: unknown; refreshToken?: unknown };
  try {
    body = (await req.json()) as { accessToken?: unknown; refreshToken?: unknown };
  } catch (err) {
    logger.error("session: failed to parse request body", {
      request_id: requestId,
      route: ROUTE,
      error_code: "INVALID_JSON",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Neplatný formát JSON", 400), requestId),
      { status: 400 },
    );
  }

  if (typeof body.accessToken !== "string" || typeof body.refreshToken !== "string") {
    logger.warn("session: missing accessToken or refreshToken", {
      request_id: requestId,
      route: ROUTE,
      error_code: "VALIDATION_ERROR",
    });
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Přístupový token a obnovovací token jsou povinné", 400), requestId),
      { status: 400 },
    );
  }

  try {
    await setAuthCookies(body.accessToken, body.refreshToken);

    // Sync onboarding status cookie and return status so caller can route without a second request
    let onboardingStatus: string = "incomplete";
    try {
      const validated = await validateToken(body.accessToken, requestId);
      const profile = await db.profile.findUnique({
        where: { userId: validated.id },
        select: { onboardingStatus: true },
      });
      onboardingStatus = profile?.onboardingStatus ?? "incomplete";
      await setOnboardingStatusCookie(onboardingStatus);
    } catch {
      // Non-fatal — callback will route to profile step
    }

    logger.info("session: cookies set", { request_id: requestId, route: ROUTE });
    return NextResponse.json({ ok: true, onboardingStatus });
  } catch (err) {
    logger.error("session: failed to set auth cookies", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Nepodařilo se nastavit relaci", 500), requestId),
      { status: 500 },
    );
  }
}
