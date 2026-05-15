import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import type { AuthLoginResponse } from "@/types/auth";
import { toErrorResponse, UnauthenticatedError, AppError } from "@/types/errors";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const ROUTE = "/api/auth/login";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown };
  } catch (err) {
    logger.error("login: failed to parse request body", {
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

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    logger.warn("login: missing email or password", {
      request_id: requestId,
      route: ROUTE,
      error_code: "VALIDATION_ERROR",
    });
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "email and password required", 400), requestId),
      { status: 400 },
    );
  }

  if (!AUTH_SERVICE_BASE_URL) {
    logger.error("login: AUTH_SERVICE_BASE_URL is not configured", {
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
    const upstream = await fetch(`${AUTH_SERVICE_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });

    if (upstream.status === 401 || upstream.status === 403) {
      logger.warn("login: invalid credentials", {
        request_id: requestId,
        route: ROUTE,
        error_code: "UNAUTHENTICATED",
        status_code: upstream.status,
      });
      throw new UnauthenticatedError("Invalid credentials");
    }

    if (!upstream.ok) {
      const upstreamBody = await upstream.text().catch(() => "(unreadable)");
      logger.error("login: auth-microservice returned error", {
        request_id: requestId,
        route: ROUTE,
        error_code: "AUTH_SERVICE_ERROR",
        status_code: upstream.status,
        upstream_body: upstreamBody,
      });
      throw new AppError("INTERNAL_ERROR", "Auth service error", 500);
    }

    const data = (await upstream.json()) as AuthLoginResponse;
    const accessToken = data.data?.accessToken ?? (data as any).accessToken;
    const refreshToken = data.data?.refreshToken ?? (data as any).refreshToken;
    const user = data.data?.user ?? (data as any).user;
    await setAuthCookies(accessToken, refreshToken);

    logger.info("login: user logged in", {
      request_id: requestId,
      route: ROUTE,
    });

    return NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("login: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(
        toErrorResponse(err, requestId),
        { status: err.statusCode },
      );
    }
    logger.error("login: unexpected error", {
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
