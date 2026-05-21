import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { getAvatarUrl } from "@/lib/storage/media-urls";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/hall-of-fame";

type HofRow = { userId: string; score: bigint; achievementKeys: string[] };

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    await getCurrentUser(requestId); // auth required

    // Aggregate scores in the database — top 20 only
    const top20Raw = await db.$queryRaw<HofRow[]>(Prisma.sql`
      SELECT
        ua.user_id AS "userId",
        SUM(CASE a.tier WHEN 'gold' THEN 3 WHEN 'silver' THEN 2 ELSE 1 END) AS score,
        array_agg(ua.achievement_key) AS "achievementKeys"
      FROM user_achievements ua
      JOIN achievements a ON a.key = ua.achievement_key
      GROUP BY ua.user_id
      ORDER BY score DESC
      LIMIT 20
    `);

    // Fetch profiles for those users
    const userIds = top20Raw.map((r) => r.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, titleBefore: true, titleAfter: true, firstName: true, lastName: true, avatarFileKey: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const result = await Promise.all(top20Raw.map(async (u, i) => {
      const profile = profileMap.get(u.userId);
      const avatarUrl = await getAvatarUrl(profile?.avatarFileKey ?? null, requestId);
      return {
        rank: i + 1,
        userId: u.userId,
        titleBefore: profile?.titleBefore ?? null,
        titleAfter: profile?.titleAfter ?? null,
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
        avatarUrl,
        score: Number(u.score),
        achievementKeys: u.achievementKeys,
      };
    }));

    const response = NextResponse.json({ items: result }, { status: 200 });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("hall-of-fame GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
