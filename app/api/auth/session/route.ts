import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, AppError } from "@/types/errors";

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
      toErrorResponse(new AppError("VALIDATION_ERROR", "Invalid JSON", 400), requestId),
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
      toErrorResponse(new AppError("VALIDATION_ERROR", "accessToken and refreshToken required", 400), requestId),
      { status: 400 },
    );
  }

  try {
    await setAuthCookies(body.accessToken, body.refreshToken);
    logger.info("session: cookies set", { request_id: requestId, route: ROUTE });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("session: failed to set auth cookies", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Failed to set session", 500), requestId),
      { status: 500 },
    );
  }
}
