import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getIdea, castVote, removeVote } from "@/lib/db/ideas";
import { writeAuditEvent } from "@/lib/db/audit";
import { requireApproved } from "@/lib/auth/require-approved";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/ideas/[id]/vote";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: ideaId } = await params;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const idea = await getIdea(ideaId);
    if (!idea) throw new AppError("NOT_FOUND", "Idea not found", 404);

    const body = await req.json().catch(() => ({})) as { voteType?: string };
    const voteType = body.voteType ?? "support";
    if (!["support", "oppose"].includes(voteType)) {
      throw new AppError("VALIDATION_ERROR", "voteType must be support or oppose", 400);
    }

    await castVote(ideaId, user.id, voteType);

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? idea.schoolId,
      schoolId: idea.schoolId,
      actorUserId: user.id,
      action: "idea.voted",
      entityType: "idea",
      entityId: ideaId,
      metadata: { voteType },
      requestId,
    });

    logger.info("ideas/vote POST: voted", { request_id: requestId, route: ROUTE, user_id: user.id, idea_id: ideaId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas/vote POST: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: ideaId } = await params;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const idea = await getIdea(ideaId);
    if (!idea) throw new AppError("NOT_FOUND", "Idea not found", 404);

    await removeVote(ideaId, user.id);

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? idea.schoolId,
      schoolId: idea.schoolId,
      actorUserId: user.id,
      action: "idea.vote_removed",
      entityType: "idea",
      entityId: ideaId,
      requestId,
    });

    logger.info("ideas/vote DELETE: vote removed", { request_id: requestId, route: ROUTE, user_id: user.id, idea_id: ideaId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas/vote DELETE: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
