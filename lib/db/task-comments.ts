import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { getAvatarUrl } from "@/lib/storage/media-urls";
import { AppError } from "@/types/errors";

export interface TaskCommentWithAuthor {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: Date;
  authorFirstName: string;
  authorAvatarUrl: string | null;
}

export async function listTaskComments(taskId: string, requestId?: string): Promise<TaskCommentWithAuthor[]> {
  const rows = await db.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const profiles = await db.profile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, firstName: true, avatarFileKey: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return Promise.all(
    rows.map(async (c) => {
      const profile = profileMap.get(c.userId);
      return {
        id: c.id,
        taskId: c.taskId,
        userId: c.userId,
        body: c.body,
        createdAt: c.createdAt,
        authorFirstName: profile?.firstName ?? "Rodič",
        authorAvatarUrl: await getAvatarUrl(profile?.avatarFileKey ?? null, requestId ?? ""),
      };
    }),
  );
}

export async function createTaskComment(
  taskId: string,
  userId: string,
  body: string,
  tenantId: string,
  schoolId: string,
  requestId?: string,
): Promise<TaskCommentWithAuthor> {
  const task = await db.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) throw new AppError("NOT_FOUND", "Úkol nenalezen", 404);

  const comment = await db.$transaction(async (tx) => {
    const c = await tx.taskComment.create({ data: { taskId, userId, body } });
    await writeAuditEvent(
      {
        tenantId,
        schoolId,
        actorUserId: userId,
        action: "task_comment.created",
        entityType: "task_comment",
        entityId: c.id,
        requestId,
      },
      tx,
    );
    return c;
  });

  const profile = await db.profile.findUnique({
    where: { userId },
    select: { firstName: true, avatarFileKey: true },
  });

  return {
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId,
    body: comment.body,
    createdAt: comment.createdAt,
    authorFirstName: profile?.firstName ?? "Rodič",
    authorAvatarUrl: await getAvatarUrl(profile?.avatarFileKey ?? null, requestId ?? ""),
  };
}
