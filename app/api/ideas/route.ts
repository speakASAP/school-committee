import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { createIdea, listIdeas, getUserVotedIdeaIds } from "@/lib/db/ideas";
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
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);

    const result = await listIdeas(schoolId, {
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const votedIds = user
      ? await getUserVotedIdeaIds(user.id, result.items.map((i) => i.id))
      : new Set<string>();

    const safeItems = result.items.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      isAnonymous: idea.isAnonymous,
      categories: idea.categories,
      voteCount: idea.voteCount,
      commentCount: idea.commentCount,
      createdAt: idea.createdAt,
      authorId: user && !idea.isAnonymous ? idea.submittedBy : null,
      hasVoted: votedIds.has(idea.id),
      photos: idea.photos,
      videos: idea.videos,
    }));

    return NextResponse.json({ items: safeItems, nextCursor: result.nextCursor }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("ideas GET: error", { request_id: requestId, route: ROUTE, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
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
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    if (!body.title?.trim()) throw new AppError("VALIDATION_ERROR", "title is required", 400);

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
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
