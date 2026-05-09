import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getAccessToken } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const token = await getAccessToken();

  // Best-effort call to auth-microservice — clear cookies regardless
  if (token) {
    try {
      await fetch(`${AUTH_SERVICE_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Non-fatal — session is client-side cleared either way
    }
  }

  await clearAuthCookies();
  logger.info("user logged out", { request_id: requestId, route: "/api/auth/logout" });

  return NextResponse.json({ success: true }, { status: 200 });
}
