import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { toErrorResponse, AppError } from "@/types/errors";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://school-committee.alfares.cz";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Invalid JSON", 400), requestId),
      { status: 400 },
    );
  }

  if (typeof body.email !== "string" || !body.email.includes("@")) {
    return NextResponse.json(
      toErrorResponse(new AppError("VALIDATION_ERROR", "Valid email required", 400), requestId),
      { status: 400 },
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
      throw new AppError("INTERNAL_ERROR", "Auth service error", 500);
    }

    logger.info("magic link requested", { request_id: requestId, route: "/api/auth/magic-link" });

    // Always return success to avoid email enumeration
    return NextResponse.json({ sent: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("magic link request error", { request_id: requestId, error_code: String(err) });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
