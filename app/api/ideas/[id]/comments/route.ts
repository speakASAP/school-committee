import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { listIdeaComments, createIdeaComment, getUserLikedCommentIds } from "@/lib/db/idea-comments";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/ideas/[id]/comments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    const { id: ideaId } = await params;
    const { searchParams } = new URL(req.url);
    const result = await listIdeaComments(ideaId, {
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const likedIds = await getUserLikedCommentIds(user.id, result.items.map((c) => c.id));

    const items = result.items.map((c) => ({
      ...c,
      hasLiked: likedIds.has(c.id),
      isOwn: c.userId === user.id,
    }));

    return NextResponse.json({ items, nextCursor: result.nextCursor }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("comments GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    const { id: ideaId } = await params;
    const body = await req.json() as { body?: string };
    if (!body.body?.trim()) throw new AppError("VALIDATION_ERROR", "body is required", 400);

    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    const tenantId = process.env.DEFAULT_TENANT_ID ?? schoolId;

    const comment = await createIdeaComment(ideaId, user.id, body.body.trim(), tenantId, schoolId, requestId);

    awardBadgesForUser(user.id).catch(() => {});

    return NextResponse.json({ ...comment, hasLiked: false, isOwn: true }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("comments POST: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
