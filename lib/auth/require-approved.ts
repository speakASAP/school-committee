import type { CurrentUser } from "@/types/auth";
import { AppError } from "@/types/errors";

export function requireApproved(user: CurrentUser): void {
  if (user.approvalStatus !== "approved") {
    throw new AppError(
      "ACCOUNT_PENDING_APPROVAL",
      "Váš účet čeká na schválení správcem školy.",
      403,
    );
  }
}
