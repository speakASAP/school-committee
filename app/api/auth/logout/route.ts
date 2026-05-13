import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getAccessToken } from "@/lib/auth/session";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const ROUTE = "/api/auth/logout";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const token = await getAccessToken();

  if (token) {
    try {
      const upstream = await fetch(`${AUTH_SERVICE_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(3000),
      });
      if (!upstream.ok) {
        logger.error("logout: auth-microservice returned error", {
          request_id: requestId,
          route: ROUTE,
          error_code: "AUTH_SERVICE_ERROR",
          status_code: upstream.status,
        });
      }
    } catch (err) {
      logger.error("logout: failed to call auth-microservice", {
        request_id: requestId,
        route: ROUTE,
        error_code: "AUTH_SERVICE_UNREACHABLE",
        error_message: err instanceof Error ? err.message : String(err),
        error_name: err instanceof Error ? err.name : undefined,
      });
    }
  }

  await clearAuthCookies();
  logger.info("logout: user logged out", { request_id: requestId, route: ROUTE });

  return NextResponse.json({ success: true }, { status: 200 });
}
