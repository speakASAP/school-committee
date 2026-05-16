import { getAccessToken } from "@/lib/auth/session";
import { validateToken } from "@/lib/auth/validate-token";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import type { CurrentUser, Role } from "@/types/auth";
import { UnauthenticatedError } from "@/types/errors";

const PLATFORM_ROLES = new Set<string>([
  "parent",
  "committee",
  "teacher",
  "school_staff",
  "admin",
]);

export async function getCurrentUser(requestId?: string): Promise<CurrentUser> {
  const token = await getAccessToken();
  if (!token) {
    throw new UnauthenticatedError("No session");
  }
  const validated = await validateToken(token, requestId);

  const [dbRoles, profile] = await Promise.all([
    db.userRole.findMany({
      where: { userId: validated.id, revokedAt: null },
      select: { role: true },
    }),
    db.profile.findUnique({
      where: { userId: validated.id },
      select: { approvalStatus: true, rejectionReason: true },
    }),
  ]);

  const roles = dbRoles
    .map((r) => r.role)
    .filter((r): r is Role => PLATFORM_ROLES.has(r));

  return {
    id: validated.id,
    email: validated.email,
    roles,
    approvalStatus: profile?.approvalStatus ?? "pending",
    rejectionReason: profile?.rejectionReason ?? null,
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
