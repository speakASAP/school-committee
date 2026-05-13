import { getAccessToken } from "@/lib/auth/session";
import { validateToken } from "@/lib/auth/validate-token";
import { logger } from "@/lib/logger";
import type { CurrentUser, Role } from "@/types/auth";
import { UnauthenticatedError } from "@/types/errors";

const PLATFORM_ROLES = new Set<string>([
  "parent",
  "committee",
  "teacher",
  "school_staff",
  "admin",
]);

function filterPlatformRoles(roles: string[]): Role[] {
  return roles.flatMap((r) => {
    // Accept bare names ("parent") or scoped names ("app:school-committee:parent")
    if (PLATFORM_ROLES.has(r)) return [r as Role];
    const last = r.split(":").at(-1) ?? "";
    if (PLATFORM_ROLES.has(last)) return [last as Role];
    return [];
  });
}

export async function getCurrentUser(requestId?: string): Promise<CurrentUser> {
  const token = await getAccessToken();
  if (!token) {
    throw new UnauthenticatedError("No session");
  }
  const validated = await validateToken(token, requestId);
  return {
    id: validated.id,
    email: validated.email,
    roles: filterPlatformRoles(validated.roles),
  };
}

export async function tryGetCurrentUser(
  requestId?: string,
): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser(requestId);
  } catch (err) {
    if (!(err instanceof UnauthenticatedError)) {
      logger.error("tryGetCurrentUser: unexpected error during auth check", {
        request_id: requestId,
        error_code: "AUTH_CHECK_ERROR",
        error_message: err instanceof Error ? err.message : String(err),
        error_name: err instanceof Error ? err.name : undefined,
      });
    }
    return null;
  }
}
