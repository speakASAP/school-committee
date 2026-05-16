import { db } from "@/lib/db/client";

export async function listIdeas(opts: {
  schoolId: string;
  classId?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}) {
  const limit = Math.min(opts.limit ?? 20, 100);

  const items = await db.idea.findMany({
    where: {
      schoolId: opts.schoolId,
      ...(opts.classId ? { classId: opts.classId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
    },
    include: {
      votes: { select: { userId: true, voteType: true } },
      class: { select: { name: true, grade: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return {
    items: page.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      budgetNeededCzk: idea.budgetNeededCzk,
      status: idea.status,
      categories: idea.categories,
      classId: idea.classId,
      className: idea.class ? `${idea.class.grade} ${idea.class.name}` : null,
      submittedBy: idea.submittedBy,
      createdAt: idea.createdAt,
      voteCount: idea.votes.filter((v) => v.voteType === "support").length,
      voterIds: idea.votes.map((v) => v.userId),
    })),
    nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
  };
}

export async function createIdea(data: {
  schoolId: string;
  classId?: string;
  submittedBy: string;
  title: string;
  description: string;
  budgetNeededCzk?: number;
  categories?: string[];
}) {
  return db.idea.create({
    data: {
      schoolId: data.schoolId,
      classId: data.classId ?? null,
      submittedBy: data.submittedBy,
      title: data.title,
      description: data.description,
      budgetNeededCzk: data.budgetNeededCzk ?? null,
      categories: data.categories ?? [],
      status: "submitted",
    },
  });
}

export async function getIdea(id: string) {
  return db.idea.findUnique({ where: { id } });
}

export async function castVote(ideaId: string, userId: string, voteType: string) {
  return db.ideaVote.upsert({
    where: { ideaId_userId: { ideaId, userId } },
    create: { ideaId, userId, voteType },
    update: { voteType },
  });
}

export async function removeVote(ideaId: string, userId: string) {
  return db.ideaVote.deleteMany({ where: { ideaId, userId } });
}
