import type { FeedbackItem } from "@prisma/client";
import { db } from "@/lib/db/client";
import { NotFoundError } from "@/types/errors";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";

export interface CreateFeedbackInput {
  schoolId: string;
  classId?: string;
  userId?: string;
  isAnonymous: boolean;
  categories: string[];
  type: string;
  text: string;
  voiceFileKey?: string;
  voiceTranscript?: string;
}

export async function createFeedback(input: CreateFeedbackInput): Promise<FeedbackItem> {
  return db.feedbackItem.create({
    data: {
      schoolId: input.schoolId,
      classId: input.classId ?? null,
      // Strip userId if anonymous to enforce non-linkability
      userId: input.isAnonymous ? null : (input.userId ?? null),
      isAnonymous: input.isAnonymous,
      categories: input.categories,
      type: input.type,
      text: input.text,
      voiceFileKey: input.voiceFileKey ?? null,
      voiceTranscript: input.voiceTranscript ?? null,
      status: "new",
    },
  });
}

export async function listFeedback(
  schoolId: string,
  params?: PageParams & { status?: string; category?: string },
): Promise<PageResult<FeedbackItem>> {
  const limit = resolveLimit(params?.limit);
  const rows = await db.feedbackItem.findMany({
    where: {
      schoolId,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.category ? { categories: { hasSome: [params.category] } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });
  return buildPage(rows, limit);
}

export async function moderateFeedback(
  id: string,
  moderatorId: string,
  status: string,
): Promise<FeedbackItem> {
  const item = await db.feedbackItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError("Zpětná vazba nenalezena");
  return db.feedbackItem.update({
    where: { id },
    data: { status, moderatedBy: moderatorId },
  });
}
