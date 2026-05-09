import type { Task } from "@prisma/client";
import { db } from "@/lib/db/client";
import { AppError, NotFoundError } from "@/types/errors";
import { writeAuditEvent, type AuditEventInput } from "@/lib/db/audit";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";

export interface ListTasksParams extends PageParams {
  schoolId: string;
  classId?: string;
  status?: string;
}

export async function listTasks(params: ListTasksParams): Promise<PageResult<Task>> {
  const limit = resolveLimit(params.limit);
  const rows = await db.task.findMany({
    where: {
      schoolId: params.schoolId,
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });
  return buildPage(rows, limit);
}

export async function getTask(id: string): Promise<Task> {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

export interface ClaimTaskAuditContext {
  tenantId: string;
  schoolId: string;
  requestId?: string;
}

export async function claimTask(
  taskId: string,
  userId: string,
  audit: ClaimTaskAuditContext,
): Promise<Task> {
  return db.$transaction(async (tx) => {
    // SELECT FOR UPDATE — prevents concurrent claims
    const rows = await tx.$queryRaw<Task[]>`
      SELECT * FROM tasks WHERE id = ${taskId}::uuid FOR UPDATE
    `;

    const task = rows[0];
    if (!task) throw new NotFoundError("Task not found");

    if (task.status !== "open") {
      throw new AppError("TASK_ALREADY_CLAIMED", "Task is no longer open", 409);
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: { status: "reserved", assignedTo: userId },
    });

    await tx.taskStatusEvent.create({
      data: {
        taskId,
        oldStatus: "open",
        newStatus: "reserved",
        actorUserId: userId,
      },
    });

    const auditInput: AuditEventInput = {
      tenantId: audit.tenantId,
      schoolId: audit.schoolId,
      actorUserId: userId,
      action: "task.claimed",
      entityType: "task",
      entityId: taskId,
      requestId: audit.requestId,
    };
    await writeAuditEvent(auditInput, tx);

    return updated;
  });
}
