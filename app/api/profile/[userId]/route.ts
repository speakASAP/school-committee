import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { getAvatarUrl } from "@/lib/storage/media-urls";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/profile/[userId]";

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { userId } = await params;
  try {
    await getCurrentUser(requestId); // auth required

    const [profile, userAchievements, roles, ideaCount, voteCount, commentCount, taskCount] =
      await Promise.all([
        db.profile.findUnique({
          where: { userId },
          select: { titleBefore: true, titleAfter: true, firstName: true, lastName: true, bio: true, createdAt: true, avatarFileKey: true },
        }),
        db.userAchievement.findMany({
          where: { userId },
          select: { achievementKey: true, awardedAt: true },
        }),
        db.userRole.findMany({ where: { userId, revokedAt: null }, select: { role: true } }),
        db.idea.count({ where: { submittedBy: userId, status: "active", isAnonymous: false } }),
        db.ideaVote.count({ where: { userId } }),
        db.ideaComment.count({ where: { userId } }),
        db.taskStatusEvent.count({ where: { actorUserId: userId, newStatus: "completed" } }),
      ]);

    if (!profile) throw new AppError("NOT_FOUND", "Uživatel nenalezen", 404);

    const avatarUrl = await getAvatarUrl(profile.avatarFileKey ?? null, requestId);
    const earnedKeys = userAchievements.map((a) => a.achievementKey);
    const allAchievements = earnedKeys.length > 0
      ? await db.achievement.findMany({ where: { key: { in: earnedKeys } }, select: { key: true, tier: true, labelCs: true } })
      : [];

    const achievementMeta = new Map(allAchievements.map((a) => [a.key, a]));

    const enrichedAchievements = userAchievements.map((a) => {
      const meta = achievementMeta.get(a.achievementKey);
      return {
        key: a.achievementKey,
        tier: meta?.tier ?? "bronze",
        labelCs: meta?.labelCs ?? a.achievementKey,
        awardedAt: a.awardedAt,
      };
    });

    return NextResponse.json({
      userId,
      titleBefore: profile.titleBefore ?? null,
      titleAfter: profile.titleAfter ?? null,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio ?? null,
      avatarUrl,
      joinedAt: profile.createdAt,
      roles: roles.map((r) => r.role),
      achievements: enrichedAchievements,
      stats: {
        ideasPosted: ideaCount,
        votesCast: voteCount,
        commentsLeft: commentCount,
        tasksCompleted: taskCount,
      },
    }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("profile GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
