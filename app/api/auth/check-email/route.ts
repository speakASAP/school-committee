import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const AUTH_SERVICE_CLIENT_SECRET = process.env.AUTH_SERVICE_CLIENT_SECRET ?? "";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
  if (!AUTH_SERVICE_BASE_URL || !AUTH_SERVICE_CLIENT_SECRET) {
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
      return NextResponse.json({ exists: false }, { status: 200 });
    }
    const data = (await upstream.json()) as { exists?: boolean };
    return NextResponse.json({ exists: !!data.exists }, { status: 200 });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
