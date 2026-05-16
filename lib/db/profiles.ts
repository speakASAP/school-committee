import type { Profile } from "@prisma/client";
import { db } from "@/lib/db/client";
import { NotFoundError } from "@/types/errors";

export async function getProfile(userId: string): Promise<Profile> {
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found");
  return profile;
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<Profile, "userId" | "createdAt" | "updatedAt">>,
): Promise<Profile> {
  return db.profile.upsert({
    where: { userId },
    create: {
      userId,
      tenantId: data.tenantId!,
      schoolId: data.schoolId!,
      firstName: data.firstName!,
      lastName: data.lastName!,
      phone: data.phone,
      language: data.language ?? "cs",
      participationType: data.participationType!,
      onboardingStatus: data.onboardingStatus ?? "incomplete",
      approvalStatus: data.approvalStatus ?? "pending",
    },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      language: data.language,
      participationType: data.participationType,
      onboardingStatus: data.onboardingStatus,
      approvalStatus: data.approvalStatus,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt,
      rejectionReason: data.rejectionReason,
      isActive: data.isActive,
    },
  });
}

export async function listPendingApprovals(tenantId: string, schoolId?: string) {
  return db.profile.findMany({
    where: {
      tenantId,
      onboardingStatus: "complete",
      approvalStatus: "pending",
      ...(schoolId ? { schoolId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function countPendingApprovals(tenantId: string): Promise<number> {
  return db.profile.count({
    where: { tenantId, onboardingStatus: "complete", approvalStatus: "pending" },
  });
}
