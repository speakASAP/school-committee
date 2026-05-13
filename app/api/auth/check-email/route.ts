import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const AUTH_SERVICE_CLIENT_SECRET = process.env.AUTH_SERVICE_CLIENT_SECRET ?? "";
const ROUTE = "/api/auth/check-email";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  const email = req.nextUrl.searchParams.get("email");
  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  if (!AUTH_SERVICE_BASE_URL || !AUTH_SERVICE_CLIENT_SECRET) {
    logger.error("check-email: AUTH_SERVICE_BASE_URL or AUTH_SERVICE_CLIENT_SECRET is not configured", {
      request_id: requestId,
      route: ROUTE,
      error_code: "MISCONFIGURATION",
      has_base_url: !!AUTH_SERVICE_BASE_URL,
      has_client_secret: !!AUTH_SERVICE_CLIENT_SECRET,
    });
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  try {
    const upstream = await fetch(
      `${AUTH_SERVICE_BASE_URL}/auth/internal/check-email?email=${encodeURIComponent(email)}`,
      {
        headers: {
          "x-internal-service-token": AUTH_SERVICE_CLIENT_SECRET,
          "x-service-name": "school-committee",
        },
        cache: "no-store",
      },
    );
    if (!upstream.ok) {
      const upstreamBody = await upstream.text().catch(() => "(unreadable)");
      logger.error("check-email: auth-microservice returned error", {
        request_id: requestId,
        route: ROUTE,
        error_code: "AUTH_SERVICE_ERROR",
        status_code: upstream.status,
        upstream_body: upstreamBody,
      });
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    const data = (await upstream.json()) as { exists?: boolean };
    return NextResponse.json({ exists: !!data.exists }, { status: 200 });
  } catch (err) {
    logger.error("check-email: unexpected error reaching auth-microservice", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
