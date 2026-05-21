import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { createIdea, listIdeas, getUserVotedIdeaIds } from "@/lib/db/ideas";
import { db } from "@/lib/db/client";
import { getAvatarUrl } from "@/lib/storage/media-urls";

const STAFF_ROLES = new Set(["school_staff", "admin", "committee"]);
import { awardBadgesForUser } from "@/lib/gamification/award-badges";
import { transcribeVoice } from "@/lib/ai/transcribe";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/ideas";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await tryGetCurrentUser(requestId);
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);

    const isAdmin = searchParams.get("admin") === "1" && user && user.roles.some((r) => STAFF_ROLES.has(r));

    if (isAdmin) {
      const statusFilter = searchParams.get("status");
      const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 200;
      const rows = await db.idea.findMany({
        where: {
          schoolId,
          ...(statusFilter ? { status: statusFilter } : { status: { not: "deleted" } }),
        },
        include: {
          _count: { select: { votes: true, comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      const items = rows.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        isAnonymous: idea.isAnonymous,
        categories: idea.categories,
        status: idea.status,
        voteCount: idea._count.votes,
        commentCount: idea._count.comments,
        createdAt: idea.createdAt,
        submittedBy: idea.isAnonymous ? null : idea.submittedBy,
      }));
      return NextResponse.json({ items }, { status: 200 });
    }

    const result = await listIdeas(schoolId, {
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const votedIds = user
      ? await getUserVotedIdeaIds(user.id, result.items.map((i) => i.id))
      : new Set<string>();

    // Batch-fetch avatars for non-anonymous authors visible to authenticated users
    const authorIds = user
      ? result.items.filter((i) => !i.isAnonymous && i.submittedBy).map((i) => i.submittedBy!)
      : [];
    const authorProfiles = authorIds.length > 0
      ? await db.profile.findMany({ where: { userId: { in: authorIds } }, select: { userId: true, avatarFileKey: true } })
      : [];
    const authorAvatarUrlMap = new Map(
      await Promise.all(
        authorProfiles.map(async (p) => [p.userId, await getAvatarUrl(p.avatarFileKey ?? null, requestId)] as const)
      )
    );

    const safeItems = result.items.map((idea) => {
      const authorId = user && !idea.isAnonymous ? idea.submittedBy : null;
      return {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        isAnonymous: idea.isAnonymous,
        categories: idea.categories,
        voteCount: idea.voteCount,
        commentCount: idea.commentCount,
        createdAt: idea.createdAt,
        authorId,
        authorAvatarUrl: authorId ? (authorAvatarUrlMap.get(authorId) ?? null) : null,
        hasVoted: votedIds.has(idea.id),
        photos: idea.photos,
        videos: idea.videos,
      };
    });

    return NextResponse.json({ items: safeItems, nextCursor: result.nextCursor }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("ideas GET: error", { request_id: requestId, route: ROUTE, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    const body = await req.json() as {
      title?: string;
      description?: string;
      isAnonymous?: boolean;
      voiceFileKey?: string;
      voiceLanguage?: string;
      photoFileKeys?: string[];
      videoFileKeys?: string[];
      schoolId?: string;
    };

    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);
    if (!body.title?.trim()) throw new AppError("VALIDATION_ERROR", "Název nápadu je povinný", 400);

    let voiceTranscript: string | undefined;
    if (body.voiceFileKey) {
      voiceTranscript = await transcribeVoice(body.voiceFileKey, body.voiceLanguage);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? schoolId;
    const result = await createIdea({
      schoolId,
      submittedBy: user.id,
      title: body.title.trim(),
      description: body.description?.trim() ?? "",
      isAnonymous: body.isAnonymous ?? false,
      voiceFileKey: body.voiceFileKey,
      voiceTranscript,
      photoFileKeys: body.photoFileKeys ?? [],
      videoFileKeys: body.videoFileKeys ?? [],
      tenantId,
      requestId,
    });

    awardBadgesForUser(user.id).catch(() => {});

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("ideas POST: error", { request_id: requestId, route: ROUTE, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas POST: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
