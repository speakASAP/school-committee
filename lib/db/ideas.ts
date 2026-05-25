import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { resolveLimit, buildPage } from "@/lib/db/pagination";
import type { PageParams, PageResult } from "@/lib/db/pagination";
import { AppError } from "@/types/errors";

function parseFileKey(fileKey: string): { fileId: string; fileExt: string } {
  const parts = fileKey.split("/");
  const filename = parts[parts.length - 1] ?? fileKey;
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return { fileId: filename, fileExt: "" };
  return { fileId: filename.slice(0, dotIdx), fileExt: filename.slice(dotIdx + 1) };
}

export interface IdeaWithCounts {
  id: string;
  schoolId: string;
  submittedBy: string | null;
  title: string;
  description: string;
  isAnonymous: boolean;
  categories: string[];
  status: string;
  voiceFileKey: string | null;
  voiceTranscript: string | null;
  createdAt: Date;
  updatedAt: Date;
  voteCount: number;
  commentCount: number;
  photos: { fileId: string; fileExt: string; sortOrder: number }[];
  videos: { fileId: string; fileExt: string; sortOrder: number }[];
}

export interface CreateIdeaParams {
  schoolId: string;
  submittedBy: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  voiceFileKey?: string;
  voiceTranscript?: string;
  photoFileKeys?: string[];
  videoFileKeys?: string[];
  categories?: string[];
  tenantId: string;
  requestId?: string;
}

export async function createIdea(params: CreateIdeaParams): Promise<{ id: string }> {
  const {
    schoolId, submittedBy, title, description, isAnonymous,
    voiceFileKey, voiceTranscript, photoFileKeys = [], videoFileKeys = [],
    categories = [], tenantId, requestId,
  } = params;

  const result = await db.$transaction(async (tx) => {
    const idea = await tx.idea.create({
      data: {
        schoolId,
        submittedBy,
        title,
        description,
        isAnonymous,
        voiceFileKey,
        voiceTranscript,
        status: "active",
        categories,
      },
    });

    if (photoFileKeys.length > 0) {
      await tx.ideaPhoto.createMany({
        data: photoFileKeys.map((key, i) => {
          const { fileId, fileExt } = parseFileKey(key);
          return { ideaId: idea.id, fileId, fileExt, sortOrder: i };
        }),
      });
    }

    if (videoFileKeys.length > 0) {
      await tx.ideaVideo.createMany({
        data: videoFileKeys.map((key, i) => {
          const { fileId, fileExt } = parseFileKey(key);
          return { ideaId: idea.id, fileId, fileExt, sortOrder: i };
        }),
      });
    }

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: submittedBy,
      action: "idea.created",
      entityType: "idea",
      entityId: idea.id,
      requestId,
    }, tx);

    return idea;
  });

  return { id: result.id };
}

export async function listIdeas(schoolId: string, params: PageParams = {}): Promise<PageResult<IdeaWithCounts>> {
  const limit = resolveLimit(params.limit);
  const cursor = params.cursor;

  const ideas = await db.idea.findMany({
    where: { schoolId, status: { notIn: ["deleted", "rejected"] } },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { votes: true, comments: true } },
      photos: { select: { fileId: true, fileExt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
      videos: { select: { fileId: true, fileExt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  const mapped: IdeaWithCounts[] = ideas.map((idea) => ({
    id: idea.id,
    schoolId: idea.schoolId,
    submittedBy: idea.isAnonymous ? null : idea.submittedBy,
    title: idea.title,
    description: idea.description,
    isAnonymous: idea.isAnonymous,
    categories: idea.categories,
    status: idea.status,
    voiceFileKey: idea.voiceFileKey,
    voiceTranscript: idea.voiceTranscript,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    voteCount: idea._count.votes,
    commentCount: idea._count.comments,
    photos: idea.photos,
    videos: idea.videos,
  }));

  return buildPage(mapped, limit);
}

export async function getIdeaById(id: string): Promise<IdeaWithCounts> {
  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      _count: { select: { votes: true, comments: true } },
      photos: { select: { fileId: true, fileExt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
      videos: { select: { fileId: true, fileExt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!idea || idea.status === "deleted") {
    throw new AppError("NOT_FOUND", "Nápad nenalezen", 404);
  }

  return {
    id: idea.id,
    schoolId: idea.schoolId,
    submittedBy: idea.isAnonymous ? null : idea.submittedBy,
    title: idea.title,
    description: idea.description,
    isAnonymous: idea.isAnonymous,
    categories: idea.categories,
    status: idea.status,
    voiceFileKey: idea.voiceFileKey,
    voiceTranscript: idea.voiceTranscript,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    voteCount: idea._count.votes,
    commentCount: idea._count.comments,
    photos: idea.photos,
    videos: idea.videos,
  };
}

export async function softDeleteIdea(
  id: string,
  actorUserId: string,
  tenantId: string,
  schoolId: string,
  requestId?: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing = await tx.idea.findUnique({ where: { id }, select: { status: true } });
    if (!existing || existing.status === "deleted") {
      throw new AppError("NOT_FOUND", "Nápad nenalezen", 404);
    }

    await tx.idea.update({
      where: { id },
      data: { status: "deleted" },
    });

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId,
      action: "idea.deleted",
      entityType: "idea",
      entityId: id,
      requestId,
    }, tx);
  });
}

export async function toggleIdeaVote(
  ideaId: string,
  userId: string,
  tenantId: string,
  schoolId: string,
  requestId?: string,
): Promise<{ voted: boolean; voteCount: number }> {
  const idea = await db.idea.findUnique({ where: { id: ideaId }, select: { id: true, submittedBy: true, status: true } });
  if (!idea || idea.status === "deleted") {
    throw new AppError("NOT_FOUND", "Nápad nenalezen", 404);
  }
  if (idea.submittedBy === userId) {
    throw new AppError("FORBIDDEN", "Nelze hlasovat pro vlastní nápad", 403);
  }

  let voted = false;
  let voteCount = 0;

  await db.$transaction(async (tx) => {
    const existing = await tx.ideaVote.findUnique({ where: { ideaId_userId: { ideaId, userId } } });

    if (existing) {
      await tx.ideaVote.delete({ where: { ideaId_userId: { ideaId, userId } } });
      voted = false;
    } else {
      await tx.ideaVote.create({ data: { ideaId, userId, voteType: "upvote" } });
      voted = true;
    }

    voteCount = await tx.ideaVote.count({ where: { ideaId } });

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: userId,
      action: voted ? "idea.voted" : "idea.unvoted",
      entityType: "idea",
      entityId: ideaId,
      requestId,
    }, tx);
  });

  return { voted, voteCount };
}

export async function getUserVotedIdeaIds(userId: string, ideaIds: string[]): Promise<Set<string>> {
  if (ideaIds.length === 0) return new Set();
  const votes = await db.ideaVote.findMany({
    where: { userId, ideaId: { in: ideaIds } },
    select: { ideaId: true },
  });
  return new Set(votes.map((v) => v.ideaId));
}

// ---------------------------------------------------------------------------
// Legacy compatibility shims — used by existing route handlers
// ---------------------------------------------------------------------------

/** @deprecated Use getIdeaById instead */
export async function getIdea(id: string) {
  return db.idea.findUnique({ where: { id } });
}

/** @deprecated Use toggleIdeaVote instead */
export async function castVote(ideaId: string, userId: string, _voteType?: string) {
  return db.ideaVote.upsert({
    where: { ideaId_userId: { ideaId, userId } },
    create: { ideaId, userId, voteType: "upvote" as const },
    update: { voteType: "upvote" as const },
  });
}

/** @deprecated Use toggleIdeaVote instead */
export async function removeVote(ideaId: string, userId: string) {
  return db.ideaVote.deleteMany({ where: { ideaId, userId } });
}
