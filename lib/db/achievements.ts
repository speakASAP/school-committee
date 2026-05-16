import { db } from "@/lib/db/client";

export async function awardAchievement(userId: string, achievementKey: string): Promise<void> {
  await db.userAchievement.upsert({
    where: { userId_achievementKey: { userId, achievementKey } },
    update: {},
    create: { userId, achievementKey },
  });
}

export async function revokeAchievement(userId: string, achievementKey: string): Promise<void> {
  await db.userAchievement.deleteMany({
    where: { userId, achievementKey },
  });
}

export async function getTierMap(): Promise<Record<string, string>> {
  const rows = await db.achievement.findMany({ select: { key: true, tier: true } });
  return Object.fromEntries(rows.map((r) => [r.key, r.tier]));
}

export async function getTopUserByCommentLikes(): Promise<string | null> {
  // Raw SQL: group by comment author, sum likes received, get top user
  const result = await db.$queryRaw<{ user_id: string; total_likes: bigint }[]>`
    SELECT ic.user_id, COUNT(icl.id) AS total_likes
    FROM idea_comments ic
    JOIN idea_comment_likes icl ON icl.comment_id = ic.id
    GROUP BY ic.user_id
    ORDER BY total_likes DESC
    LIMIT 1
  `;
  if (result.length === 0) return null;
  return result[0].user_id;
}
