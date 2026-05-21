import { db } from "@/lib/db/client";

export interface UserRow {
  userId: string;
  tenantId: string;
  schoolId: string | null;
  email: string | null;
  titleBefore: string | null;
  titleAfter: string | null;
  firstName: string;
  lastName: string;
  bio: string | null;
  phone: string | null;
  language: string;
  participationType: string;
  onboardingStatus: string;
  approvalStatus: string;
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
}

export async function listUsers(tenantId: string, schoolId?: string): Promise<UserRow[]> {
  const profiles = await db.profile.findMany({
    where: {
      tenantId,
      ...(schoolId ? { schoolId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (profiles.length === 0) return [];

  const userIds = profiles.map((p) => p.userId);

  const activeRoles = await db.userRole.findMany({
    where: {
      userId: { in: userIds },
      tenantId,
      revokedAt: null,
    },
    select: { userId: true, role: true },
  });

  const rolesByUser = new Map<string, string[]>();
  for (const r of activeRoles) {
    const existing = rolesByUser.get(r.userId) ?? [];
    existing.push(r.role);
    rolesByUser.set(r.userId, existing);
  }

  return profiles.map((p) => ({
    userId: p.userId,
    tenantId: p.tenantId,
    schoolId: p.schoolId,
    email: p.email ?? null,
    titleBefore: p.titleBefore ?? null,
    titleAfter: p.titleAfter ?? null,
    firstName: p.firstName,
    lastName: p.lastName,
    bio: p.bio ?? null,
    phone: p.phone,
    language: p.language,
    participationType: p.participationType,
    onboardingStatus: p.onboardingStatus,
    approvalStatus: p.approvalStatus,
    rejectionReason: p.rejectionReason,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    roles: rolesByUser.get(p.userId) ?? [],
  }));
}

export async function setUserActive(
  userId: string,
  tenantId: string,
  isActive: boolean,
): Promise<void> {
  await db.profile.update({
    where: { userId },
    data: { isActive },
  });
}

export async function deleteUserFromApp(
  userId: string,
  tenantId: string,
): Promise<void> {
  await db.$transaction([
    // Revoke all roles
    db.userRole.updateMany({
      where: { userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    // Remove gamification (causes hall-of-fame ghost entries)
    db.userAchievement.deleteMany({ where: { userId } }),
    // Remove social/activity data
    db.ideaCommentLike.deleteMany({ where: { userId } }),
    db.ideaComment.deleteMany({ where: { userId } }),
    db.ideaVote.deleteMany({ where: { userId } }),
    db.taskComment.deleteMany({ where: { userId } }),
    db.eventRegistration.deleteMany({ where: { userId } }),
    db.roleUpgradeRequest.deleteMany({ where: { userId } }),
    db.child.deleteMany({ where: { parentUserId: userId } }),
    // Delete profile last (FK anchor)
    db.profile.delete({ where: { userId } }),
  ]);
}
