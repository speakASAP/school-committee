import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";

const LEADS_SERVICE_URL = process.env.LEADS_SERVICE_URL ?? "https://leads.alfares.cz";
const ROUTE = "/api/leads/submit";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    logger.error("leads/submit: failed to parse request body", {
      request_id: requestId,
      route: ROUTE,
      error_code: "INVALID_JSON",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: { message: "Invalid JSON" } }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${LEADS_SERVICE_URL}/api/leads/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Name": "school-committee",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      logger.error("leads/submit: leads service returned error", {
        request_id: requestId,
        route: ROUTE,
        error_code: "LEADS_SERVICE_ERROR",
        status_code: upstream.status,
        upstream_response: JSON.stringify(data),
      });
      return NextResponse.json(
        { error: { message: "Lead submission failed", upstream: data } },
        { status: upstream.status },
      );
    }

    logger.info("leads/submit: lead submitted", { request_id: requestId, route: ROUTE });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("leads/submit: unexpected error reaching leads service", {
      request_id: requestId,
      route: ROUTE,
      error_code: "LEADS_SERVICE_UNREACHABLE",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      {
        error: {
          message: "Could not reach leads service",
          detail: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 502 },
    );
  }
}
