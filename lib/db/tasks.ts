import type { Task } from "@prisma/client";
import { db } from "@/lib/db/client";
import { AppError, NotFoundError } from "@/types/errors";
import { writeAuditEvent, type AuditEventInput } from "@/lib/db/audit";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";

export interface ListTasksParams extends PageParams {
  schoolId: string;
  classId?: string;
  status?: string;
  callerRoles?: string[];
}

export interface TaskWithAssignee extends Task {
  assigneeName: string | null;
}

const STAFF_ROLES = new Set(['committee', 'teacher', 'school_staff', 'admin']);

export async function listTasks(params: ListTasksParams): Promise<PageResult<TaskWithAssignee>> {
  const limit = resolveLimit(params.limit);
  const isStaff = params.callerRoles?.some(r => STAFF_ROLES.has(r)) ?? false;
  const rows = await db.task.findMany({
    where: {
      schoolId: params.schoolId,
      ...(params.classId ? { classId: params.classId } : {}),
      ...(!isStaff
        ? { status: { not: 'draft' } }
        : params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const enriched: TaskWithAssignee[] = await Promise.all(
    rows.map(async (task) => {
      let assigneeName: string | null = null;
      if (task.assignedTo) {
        const profile = await db.profile.findUnique({
          where: { userId: task.assignedTo },
          select: { firstName: true },
        });
        if (profile) assigneeName = profile.firstName;
      }
      return { ...task, assigneeName };
    })
  );

  return buildPage(enriched, limit);
}

export async function getTask(id: string): Promise<Task> {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

export interface TaskDetail extends Task {
  assigneeName: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export async function getTaskDetail(id: string): Promise<TaskDetail> {
  const task = await db.task.findUnique({
    where: { id },
    include: { statusEvents: { orderBy: { createdAt: "asc" } } },
  });
  if (!task) throw new NotFoundError("Task not found");

  let assigneeName: string | null = null;
  if (task.assignedTo) {
    const profile = await db.profile.findUnique({
      where: { userId: task.assignedTo },
      select: { firstName: true },
    });
    if (profile) assigneeName = profile.firstName;
  }

  const claimedEvent = task.statusEvents.find(
    (e) => e.newStatus === "reserved" || e.newStatus === "claimed"
  );
  const completedEvent = task.statusEvents.find(
    (e) => e.newStatus === "completed" || e.newStatus === "verified"
  );

  const { statusEvents: _se, ...taskBase } = task;
  return {
    ...taskBase,
    assigneeName,
    startedAt: claimedEvent?.createdAt ?? null,
    finishedAt: completedEvent?.createdAt ?? null,
  };
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
