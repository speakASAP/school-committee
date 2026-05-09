import { NextRequest, NextResponse } from "next/server";
import { getRefreshToken, setAuthCookies } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, UnauthenticatedError, AppError } from "@/types/errors";
import type { AuthRefreshResponse } from "@/types/auth";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json(
      toErrorResponse(new UnauthenticatedError("No refresh token"), requestId),
      { status: 401 },
    );
  }

  try {
    const upstream = await fetch(`${AUTH_SERVICE_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(5000),
    });

    if (upstream.status === 401 || upstream.status === 403) {
      throw new UnauthenticatedError("Refresh token invalid or expired");
    }

    if (!upstream.ok) {
      throw new AppError("INTERNAL_ERROR", "Auth service error", 500);
    }

    const data = (await upstream.json()) as AuthRefreshResponse;
    await setAuthCookies(data.data.accessToken, data.data.refreshToken);

    logger.info("token refreshed", { request_id: requestId, route: "/api/auth/refresh" });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("refresh error", { request_id: requestId });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
