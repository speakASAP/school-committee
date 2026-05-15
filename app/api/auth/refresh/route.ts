import { NextRequest, NextResponse } from "next/server";
import { getRefreshToken, setAuthCookies } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, UnauthenticatedError, AppError } from "@/types/errors";
import type { AuthRefreshResponse } from "@/types/auth";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const ROUTE = "/api/auth/refresh";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    logger.warn("refresh: no refresh token in session", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNAUTHENTICATED",
    });
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
      logger.warn("refresh: refresh token rejected by auth-microservice", {
        request_id: requestId,
        route: ROUTE,
        error_code: "UNAUTHENTICATED",
        status_code: upstream.status,
      });
      throw new UnauthenticatedError("Refresh token invalid or expired");
    }

    if (!upstream.ok) {
      const upstreamBody = await upstream.text().catch(() => "(unreadable)");
      logger.error("refresh: auth-microservice returned error", {
        request_id: requestId,
        route: ROUTE,
        error_code: "AUTH_SERVICE_ERROR",
        status_code: upstream.status,
        upstream_body: upstreamBody,
      });
      throw new AppError("INTERNAL_ERROR", "Auth service error", 500);
    }

    const data = (await upstream.json()) as AuthRefreshResponse;
    const accessToken = data.data?.accessToken ?? (data as any).accessToken;
    const refreshToken2 = data.data?.refreshToken ?? (data as any).refreshToken;
    await setAuthCookies(accessToken, refreshToken2);

    logger.info("refresh: token refreshed", { request_id: requestId, route: ROUTE });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("refresh: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("refresh: unexpected error", {
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
