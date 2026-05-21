import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { db } from "@/lib/db/client";
import { setOnboardingStatusCookie } from "@/lib/auth/session";

// Syncs the scp_onboarding cookie from DB then redirects to ?next=
// Used by middleware when the cookie is absent (e.g. new browser session with a still-valid JWT).
export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/";

  // Prevent open-redirect: only allow internal paths
  const safePath = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  try {
    const user = await getCurrentUser(requestId);
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: { onboardingStatus: true },
    });

    const status = profile?.onboardingStatus ?? "incomplete";
    await setOnboardingStatusCookie(status);

    // Route based on status, ignoring the next param for incomplete onboarding
    let destination: string;
    if (status === "incomplete") {
      destination = "/onboarding/profile";
    } else if (status === "profile_complete") {
      destination = "/onboarding/children";
    } else if (status === "consent_complete") {
      destination = "/onboarding/consent";
    } else {
      // complete — honour the original destination
      destination = safePath === "/" ? "/dashboard" : safePath;
    }

    const res = NextResponse.redirect(new URL(destination, req.url));
    return res;
  } catch {
    // Unauthenticated or DB error — send to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", safePath);
    return NextResponse.redirect(loginUrl);
  }
}
