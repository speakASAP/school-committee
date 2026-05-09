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
    },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      language: data.language,
      participationType: data.participationType,
      onboardingStatus: data.onboardingStatus,
      isActive: data.isActive,
    },
  });
}
