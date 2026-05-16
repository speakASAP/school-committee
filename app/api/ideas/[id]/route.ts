import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getIdeaById, softDeleteIdea } from "@/lib/db/ideas";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/ideas/[id]";
const STAFF_ROLES = new Set(["school_staff", "admin", "committee"]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  try {
    const user = await tryGetCurrentUser(requestId);
    const idea = await getIdeaById(id);

    return NextResponse.json({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      isAnonymous: idea.isAnonymous,
      categories: idea.categories,
      voteCount: idea.voteCount,
      commentCount: idea.commentCount,
      createdAt: idea.createdAt,
      voiceTranscript: idea.voiceTranscript,
      photos: idea.photos,
      videos: idea.videos,
      authorId: user && !idea.isAnonymous ? idea.submittedBy : null,
    }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas/[id] GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => STAFF_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Insufficient permissions", 403);
    }
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    const tenantId = process.env.DEFAULT_TENANT_ID ?? schoolId;
    await softDeleteIdea(id, user.id, tenantId, schoolId, requestId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas/[id] DELETE: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
