import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import type { AuthLoginResponse } from "@/types/auth";
import { toErrorResponse, UnauthenticatedError, AppError } from "@/types/errors";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Invalid JSON", 400), requestId),
      { status: 400 },
    );
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "email and password required", 400), requestId),
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${AUTH_SERVICE_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });

    if (upstream.status === 401 || upstream.status === 403) {
      throw new UnauthenticatedError("Invalid credentials");
    }

    if (!upstream.ok) {
      throw new AppError("INTERNAL_ERROR", "Auth service error", 500);
    }

    const data = (await upstream.json()) as AuthLoginResponse;
    await setAuthCookies(data.data.accessToken, data.data.refreshToken);

    logger.info("user logged in", {
      request_id: requestId,
      route: "/api/auth/login",
    });

    return NextResponse.json(
      { user: { id: data.data.user.id, email: data.data.user.email } },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        toErrorResponse(err, requestId),
        { status: err.statusCode },
      );
    }
    logger.error("login error", { request_id: requestId, error_code: String(err) });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
