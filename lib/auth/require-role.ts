import type { CurrentUser, Role } from "@/types/auth";
import { ForbiddenError, UnauthenticatedError } from "@/types/errors";

export function requireRole(user: CurrentUser | null, allowed: Role[]): CurrentUser {
  if (!user) {
    throw new UnauthenticatedError();
  }
  const hasRole = user.roles.some((r) => allowed.includes(r));
  if (!hasRole) {
    throw new ForbiddenError(
      `Role required: ${allowed.join(" or ")}. User has: ${user.roles.join(", ") || "none"}`,
    );
  }
  return user;
}
