import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const LEADS_SERVICE_URL = process.env.LEADS_SERVICE_URL ?? "https://leads.alfares.cz";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
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
      return NextResponse.json(
        { error: { message: "Lead submission failed", upstream: data } },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
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
