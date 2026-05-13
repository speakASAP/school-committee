import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, AppError } from "@/types/errors";
import { getAccessToken } from "@/lib/auth/session";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const ROUTE = "/api/auth/set-password";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: { newPassword?: unknown };
  try {
    body = (await req.json()) as { newPassword?: unknown };
  } catch (err) {
    logger.error("set-password: failed to parse request body", {
      request_id: requestId,
      route: ROUTE,
      error_code: "INVALID_JSON",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Invalid JSON", 400), requestId),
      { status: 400 },
    );
  }

  if (typeof body.newPassword !== "string" || body.newPassword.length < 6) {
    logger.warn("set-password: invalid password provided", {
      request_id: requestId,
      route: ROUTE,
      error_code: "VALIDATION_ERROR",
    });
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Password must be at least 6 characters", 400), requestId),
      { status: 400 },
    );
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    logger.warn("set-password: no access token in session", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNAUTHENTICATED",
    });
    return NextResponse.json(
      toErrorResponse(new AppError("UNAUTHENTICATED", "Not authenticated", 401), requestId),
      { status: 401 },
    );
  }

  if (!AUTH_SERVICE_BASE_URL) {
    logger.error("set-password: AUTH_SERVICE_BASE_URL is not configured", {
      request_id: requestId,
      route: ROUTE,
      error_code: "MISCONFIGURATION",
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Auth service not configured", 500), requestId),
      { status: 500 },
    );
  }

  try {
    const upstream = await fetch(`${AUTH_SERVICE_BASE_URL}/auth/password-set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ newPassword: body.newPassword }),
    });

    if (!upstream.ok) {
      const upstreamBody = await upstream.json().catch(() => ({})) as { message?: string };
      const msg = upstreamBody.message ?? "Failed to set password";
      logger.error("set-password: auth-microservice returned error", {
        request_id: requestId,
        route: ROUTE,
        error_code: "AUTH_SERVICE_ERROR",
        status_code: upstream.status,
        upstream_message: msg,
      });
      throw new AppError("INTERNAL_ERROR", msg, upstream.status >= 500 ? 500 : 400);
    }

    logger.info("set-password: initial password set", { request_id: requestId, route: ROUTE });
    return NextResponse.json({ set: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("set-password: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("set-password: unexpected error", {
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
