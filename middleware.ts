import { NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/login";
const ONBOARDING_PATHS = ["/onboarding/profile", "/onboarding/children", "/onboarding/consent", "/onboarding/language", "/onboarding/set-password"];
const ONBOARDING_STATUS_COOKIE = "scp_onboarding";

// API routes needed during onboarding — must not be blocked by onboarding status check
const ONBOARDING_ALLOWED_API = [
  "/api/auth/me",
  "/api/auth/set-password",
  "/api/auth/logout",
  "/api/onboarding",
  "/api/public/classes",
];

const PUBLIC_PREFIXES = [
  "/login",
  "/confirm",
  "/auth/callback",
  "/api/auth/login",
  "/api/auth/magic-link",
  "/api/auth/session",
  "/api/auth/refresh",
  "/api/auth/check-email",
  "/api/health",
  "/api/public",
  "/api/leads",
  "/api/tasks",
  "/report",
  "/tasks",
  "/payments",
  "/feedback",
  "/prispevky",
  "/ukoly",
  "/transparentnost",
  "/gdpr",
  "/_next",
  "/favicon",
  "/logo.webp",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getOnboardingStatus(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    return typeof payload.onboarding_status === "string"
      ? payload.onboarding_status
      : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Authenticated users hitting the landing page: route by onboarding status
  if (pathname === "/") {
    const accessToken = req.cookies.get("scp_access")?.value;
    if (accessToken && !isTokenExpired(accessToken)) {
      const onboardingStatus = req.cookies.get(ONBOARDING_STATUS_COOKIE)?.value ?? getOnboardingStatus(accessToken);
      if (!onboardingStatus || onboardingStatus === "incomplete") {
        return NextResponse.redirect(new URL("/onboarding/profile", req.url));
      }
      if (onboardingStatus === "profile_complete") {
        return NextResponse.redirect(new URL("/onboarding/children", req.url));
      }
      if (onboardingStatus === "consent_complete") {
        return NextResponse.redirect(new URL("/onboarding/consent", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get("scp_access")?.value;

  if (!accessToken || isTokenExpired(accessToken)) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isOnboardingPath = ONBOARDING_PATHS.some((p) => pathname.startsWith(p));
  const isOnboardingAllowedApi = ONBOARDING_ALLOWED_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isOnboardingPath && !isOnboardingAllowedApi) {
    const onboardingStatus = req.cookies.get(ONBOARDING_STATUS_COOKIE)?.value ?? getOnboardingStatus(accessToken);
    if (!onboardingStatus || onboardingStatus === "incomplete") {
      return NextResponse.redirect(new URL("/onboarding/profile", req.url));
    }
    if (onboardingStatus === "profile_complete") {
      return NextResponse.redirect(new URL("/onboarding/children", req.url));
    }
    if (onboardingStatus === "consent_complete") {
      return NextResponse.redirect(new URL("/onboarding/consent", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
