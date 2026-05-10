import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  let body: { accessToken?: unknown; refreshToken?: unknown };
  try {
    body = (await req.json()) as { accessToken?: unknown; refreshToken?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.accessToken !== "string" || typeof body.refreshToken !== "string") {
    return NextResponse.json({ error: "accessToken and refreshToken required" }, { status: 400 });
  }

  await setAuthCookies(body.accessToken, body.refreshToken);

  return NextResponse.json({ ok: true });
}
