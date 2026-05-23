import { db } from "@/lib/db/client";
import {
  awardAchievement,
  revokeAchievement,
  getTopUserByCommentLikes,
} from "@/lib/db/achievements";

export async function awardBadgesForUser(userId: string): Promise<void> {
  const [
    profile,
    ideaCount,
    anonIdeaCount,
    voteCount,
    commentCount,
    taskCount,
    taskAcceptedCount,
    roles,
    children,
    popularIdea10,
    popularIdea50,
    existingAchievements,
  ] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true, phone: true, createdAt: true },
    }),
    db.idea.count({ where: { submittedBy: userId, status: "active" } }),
    db.idea.count({ where: { submittedBy: userId, status: "active", isAnonymous: true } }),
    db.ideaVote.count({ where: { userId } }),
    db.ideaComment.count({ where: { userId } }),
    db.taskAssignment.count({ where: { userId, status: "completed" } }),
    db.taskAssignment.count({ where: { userId } }),
    db.userRole.findMany({ where: { userId, revokedAt: null }, select: { role: true } }),
    db.child.count({ where: { parentUserId: userId } }),
    // Raw SQL: ideas submitted by this user that have >= 10 votes
    db.$queryRaw<{ idea_id: string }[]>`
      SELECT iv.idea_id
      FROM idea_votes iv
      JOIN ideas i ON i.id = iv.idea_id
      WHERE i.submitted_by = ${userId}::uuid
      GROUP BY iv.idea_id
      HAVING COUNT(*) >= 10
    `,
    // Raw SQL: ideas submitted by this user that have >= 50 votes
    db.$queryRaw<{ idea_id: string }[]>`
      SELECT iv.idea_id
      FROM idea_votes iv
      JOIN ideas i ON i.id = iv.idea_id
      WHERE i.submitted_by = ${userId}::uuid
      GROUP BY iv.idea_id
      HAVING COUNT(*) >= 50
    `,
    db.userAchievement.findMany({ where: { userId }, select: { achievementKey: true } }),
  ]);

  const roleNames = new Set(roles.map((r) => r.role));
  const earned = new Set(existingAchievements.map((a) => a.achievementKey));

  async function award(key: string) {
    if (!earned.has(key)) {
      await awardAchievement(userId, key);
      earned.add(key);
    }
  }

  const nonAnonIdeaCount = ideaCount - anonIdeaCount;

  await Promise.all([
    // Registration
    profile ? award("registered") : Promise.resolve(),

    // Profile completeness
    profile?.firstName && profile?.lastName && profile?.phone && children > 0
      ? award("profile_complete")
      : Promise.resolve(),

    // Child
    children > 0 ? award("child_added") : Promise.resolve(),

    // Roles
    roleNames.has("committee") ? award("role_committee") : Promise.resolve(),
    roleNames.has("teacher") ? award("role_teacher") : Promise.resolve(),

    // Ideas (non-anonymous only count toward badges)
    nonAnonIdeaCount >= 1 ? award("idea_first") : Promise.resolve(),
    nonAnonIdeaCount >= 5 ? award("idea_5") : Promise.resolve(),
    nonAnonIdeaCount >= 20 ? award("idea_20") : Promise.resolve(),

    // Votes cast
    voteCount >= 1 ? award("voter_first") : Promise.resolve(),
    voteCount >= 10 ? award("voter_10") : Promise.resolve(),
    voteCount >= 50 ? award("voter_50") : Promise.resolve(),

    // Comments
    commentCount >= 1 ? award("comment_first") : Promise.resolve(),
    commentCount >= 10 ? award("comment_10") : Promise.resolve(),

    // Popular ideas (any idea by this user with enough votes)
    popularIdea10.length > 0 ? award("popular_idea_10") : Promise.resolve(),
    popularIdea50.length > 0 ? award("popular_idea_50") : Promise.resolve(),

    // Tasks
    taskAcceptedCount >= 1 ? award("task_accepted") : Promise.resolve(),
    taskCount >= 1 ? award("task_completed") : Promise.resolve(),
    taskCount >= 5 ? award("task_champion_5") : Promise.resolve(),
    taskCount >= 20 ? award("task_champion_20") : Promise.resolve(),

    // Early adopter: registered within 30 days of Sept 1 of any year
    (() => {
      if (!profile?.createdAt) return Promise.resolve();
      const d = profile.createdAt;
      const year = d.getFullYear();
      const septFirst = new Date(year, 8, 1); // September = month 8
      const diffMs = d.getTime() - septFirst.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 30) return award("early_adopter");
      // Also check previous year's Sept 1
      const prevSept = new Date(year - 1, 8, 1);
      const prevDiff = (d.getTime() - prevSept.getTime()) / (1000 * 60 * 60 * 24);
      if (prevDiff >= 0 && prevDiff <= 30) return award("early_adopter");
      return Promise.resolve();
    })(),
  ]);
}

export async function recomputeBestCommenter(): Promise<void> {
  const topUserId = await getTopUserByCommentLikes();

  // Find current holder
  const current = await db.userAchievement.findFirst({
    where: { achievementKey: "best_commenter" },
    select: { userId: true },
  });

  if (topUserId === null) {
    // No one qualifies yet
    if (current) await revokeAchievement(current.userId, "best_commenter");
    return;
  }

  if (current?.userId === topUserId) return; // no change

  // Reassign: revoke from old holder, award to new
  if (current) await revokeAchievement(current.userId, "best_commenter");
  await awardAchievement(topUserId, "best_commenter");
}
