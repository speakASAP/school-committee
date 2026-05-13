import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, AppError } from "@/types/errors";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://school-committee.alfares.cz";
const ROUTE = "/api/auth/magic-link";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch (err) {
    logger.error("magic-link: failed to parse request body", {
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

  if (typeof body.email !== "string" || !body.email.includes("@")) {
    logger.warn("magic-link: invalid email provided", {
      request_id: requestId,
      route: ROUTE,
      error_code: "VALIDATION_ERROR",
    });
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Valid email required", 400), requestId),
      { status: 400 },
    );
  }

  if (!AUTH_SERVICE_BASE_URL) {
    logger.error("magic-link: AUTH_SERVICE_BASE_URL is not configured", {
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
    const upstream = await fetch(`${AUTH_SERVICE_BASE_URL}/auth/magic-link/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.email,
        return_url: `${APP_BASE_URL}/auth/callback`,
      }),
    });

    if (!upstream.ok && upstream.status !== 404) {
      const upstreamBody = await upstream.text().catch(() => "(unreadable)");
      logger.error("magic-link: auth-microservice returned error", {
        request_id: requestId,
        route: ROUTE,
        error_code: "AUTH_SERVICE_ERROR",
        status_code: upstream.status,
        upstream_body: upstreamBody,
      });
      throw new AppError("INTERNAL_ERROR", "Auth service error", 500);
    }

    logger.info("magic-link: request accepted", {
      request_id: requestId,
      route: ROUTE,
      upstream_status: upstream.status,
    });

    // Always return success to avoid email enumeration
    return NextResponse.json({ sent: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("magic-link: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("magic-link: unexpected error", {
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
