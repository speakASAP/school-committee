import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { resolveLimit, buildPage } from "@/lib/db/pagination";
import type { PageParams, PageResult } from "@/lib/db/pagination";
import { AppError } from "@/types/errors";

export interface CommentWithLikes {
  id: string;
  ideaId: string;
  userId: string;
  body: string;
  createdAt: Date;
  likeCount: number;
}

export async function listIdeaComments(
  ideaId: string,
  params: PageParams = {},
): Promise<PageResult<CommentWithLikes>> {
  const limit = resolveLimit(params.limit);
  const cursor = params.cursor;

  const rows = await db.ideaComment.findMany({
    where: { ideaId },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { likes: true } },
    },
  });

  const mapped: CommentWithLikes[] = rows.map((c) => ({
    id: c.id,
    ideaId: c.ideaId,
    userId: c.userId,
    body: c.body,
    createdAt: c.createdAt,
    likeCount: c._count.likes,
  }));

  return buildPage(mapped, limit);
}

export async function createIdeaComment(
  ideaId: string,
  userId: string,
  body: string,
  tenantId: string,
  schoolId: string,
  requestId?: string,
): Promise<CommentWithLikes> {
  const idea = await db.idea.findUnique({ where: { id: ideaId }, select: { status: true } });
  if (!idea || idea.status === "deleted") {
    throw new AppError("NOT_FOUND", "Idea not found", 404);
  }

  const comment = await db.$transaction(async (tx) => {
    const c = await tx.ideaComment.create({
      data: { ideaId, userId, body },
    });

    await writeAuditEvent(
      {
        tenantId,
        schoolId,
        actorUserId: userId,
        action: "idea_comment.created",
        entityType: "idea_comment",
        entityId: c.id,
        requestId,
      },
      tx,
    );

    return c;
  });

  return {
    id: comment.id,
    ideaId: comment.ideaId,
    userId: comment.userId,
    body: comment.body,
    createdAt: comment.createdAt,
    likeCount: 0,
  };
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
  tenantId: string,
  schoolId: string,
  requestId?: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const comment = await db.ideaComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  });
  if (!comment) throw new AppError("NOT_FOUND", "Comment not found", 404);
  if (comment.userId === userId) {
    throw new AppError("FORBIDDEN", "Cannot like your own comment", 403);
  }

  let liked = false;
  let likeCount = 0;

  await db.$transaction(async (tx) => {
    const existing = await tx.ideaCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      await tx.ideaCommentLike.delete({ where: { commentId_userId: { commentId, userId } } });
      liked = false;
    } else {
      await tx.ideaCommentLike.create({ data: { commentId, userId } });
      liked = true;
    }

    likeCount = await tx.ideaCommentLike.count({ where: { commentId } });

    await writeAuditEvent(
      {
        tenantId,
        schoolId,
        actorUserId: userId,
        action: liked ? "idea_comment.liked" : "idea_comment.unliked",
        entityType: "idea_comment",
        entityId: commentId,
        requestId,
      },
      tx,
    );
  });

  return { liked, likeCount };
}

export async function getUserLikedCommentIds(
  userId: string,
  commentIds: string[],
): Promise<Set<string>> {
  if (commentIds.length === 0) return new Set();
  const likes = await db.ideaCommentLike.findMany({
    where: { userId, commentId: { in: commentIds } },
    select: { commentId: true },
  });
  return new Set(likes.map((l) => l.commentId));
}
