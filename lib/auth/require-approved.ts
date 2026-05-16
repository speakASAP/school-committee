import type { CurrentUser } from "@/types/auth";
import { AppError } from "@/types/errors";

export function requireApproved(user: CurrentUser): void {
  if (user.approvalStatus !== "approved") {
    throw new AppError(
      "ACCOUNT_PENDING_APPROVAL",
      "Your account is awaiting approval by school staff.",
      403,
    );
  }
}
