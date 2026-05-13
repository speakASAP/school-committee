import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, AppError } from "@/types/errors";
import { getAccessToken } from "@/lib/auth/session";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: { newPassword?: unknown };
  try {
    body = (await req.json()) as { newPassword?: unknown };
  } catch {
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Invalid JSON", 400), requestId),
      { status: 400 },
    );
  }

  if (typeof body.newPassword !== "string" || body.newPassword.length < 6) {
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Password must be at least 6 characters", 400), requestId),
      { status: 400 },
    );
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      toErrorResponse(new AppError("UNAUTHENTICATED", "Not authenticated", 401), requestId),
      { status: 401 },
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
      throw new AppError("INTERNAL_ERROR", msg, upstream.status >= 500 ? 500 : 400);
    }

    logger.info("initial password set", { request_id: requestId, route: "/api/auth/set-password" });
    return NextResponse.json({ set: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("set-password error", { request_id: requestId, error_code: String(err) });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
