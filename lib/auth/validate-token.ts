import type { AuthValidateResponse } from "@/types/auth";
import { UnauthenticatedError } from "@/types/errors";
import { logger } from "@/lib/logger";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const VALIDATE_URL = `${AUTH_SERVICE_BASE_URL}/auth/validate`;
const TIMEOUT_MS = 5000;

export async function validateToken(
  token: string,
  requestId?: string,
): Promise<AuthValidateResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new UnauthenticatedError("Invalid or expired token");
    }

    if (!res.ok) {
      logger.warn("auth-microservice validate returned non-OK", {
        request_id: requestId,
        status_code: res.status,
      });
      throw new UnauthenticatedError("Token validation failed");
    }

    const raw = (await res.json()) as { user?: AuthValidateResponse } | AuthValidateResponse;
    // Auth controller returns { valid: true, user: {...} }
    const data: AuthValidateResponse = "user" in raw && raw.user ? raw.user : raw as AuthValidateResponse;

    if (!data.isActive) {
      throw new UnauthenticatedError("Account is inactive");
    }

    return data;
  } catch (err) {
    if (err instanceof UnauthenticatedError) throw err;
    if ((err as Error).name === "AbortError") {
      logger.error("auth-microservice validate timed out", {
        request_id: requestId,
      });
      throw new UnauthenticatedError("Auth service timeout");
    }
    logger.error("auth-microservice validate error", {
      request_id: requestId,
      error_code: (err as Error).message,
    });
    throw new UnauthenticatedError("Token validation failed");
  } finally {
    clearTimeout(timer);
  }
}
