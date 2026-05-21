import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getIdeaById, softDeleteIdea } from "@/lib/db/ideas";
import { db } from "@/lib/db/client";
import { getAvatarUrl } from "@/lib/storage/media-urls";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/ideas/[id]";
const STAFF_ROLES = new Set(["school_staff", "admin", "committee"]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  try {
    const user = await tryGetCurrentUser(requestId);
    const idea = await getIdeaById(id);

    const authorId = user && !idea.isAnonymous ? idea.submittedBy : null;
    let authorAvatarUrl: string | null = null;
    if (authorId) {
      const authorProfile = await db.profile.findUnique({
        where: { userId: authorId },
        select: { avatarFileKey: true },
      });
      authorAvatarUrl = await getAvatarUrl(authorProfile?.avatarFileKey ?? null, requestId);
    }

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
      authorId,
      authorAvatarUrl,
    }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas/[id] GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  const ALLOWED_STATUSES = ["submitted", "under_review", "approved", "rejected", "implemented"];
  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => STAFF_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Nedostatečná oprávnění", 403);
    }
    const body = await req.json() as { status?: string };
    if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
      throw new AppError("VALIDATION_ERROR", `Stav musí být jeden z: ${ALLOWED_STATUSES.join(", ")}`, 400);
    }
    const { writeAuditEvent } = await import("@/lib/db/audit");
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    const tenantId = process.env.DEFAULT_TENANT_ID ?? schoolId;
    const updated = await db.$transaction(async (tx) => {
      const item = await tx.idea.update({ where: { id }, data: { status: body.status! } });
      await writeAuditEvent({ tenantId, schoolId, actorUserId: user.id, action: "idea.status_updated", entityType: "idea", entityId: id, metadata: { newStatus: body.status }, requestId });
      return item;
    });
    return NextResponse.json({ id: updated.id, status: updated.status }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas/[id] PATCH: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => STAFF_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Nedostatečná oprávnění", 403);
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
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
