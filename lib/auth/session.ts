import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "scp_access";
const REFRESH_TOKEN_COOKIE = "scp_refresh";
const ONBOARDING_STATUS_COOKIE = "scp_onboarding";

const IS_PROD = process.env.NODE_ENV === "production";

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7, // 7 days — matches auth-microservice JWT_EXPIRES_IN default
  });
  jar.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 30, // 30 days — matches JWT_REFRESH_EXPIRES_IN default
  });
}

export async function setOnboardingStatusCookie(status: string): Promise<void> {
  const jar = await cookies();
  jar.set(ONBOARDING_STATUS_COOKIE, status, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(REFRESH_TOKEN_COOKIE);
  jar.delete(ONBOARDING_STATUS_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(REFRESH_TOKEN_COOKIE)?.value;
}
