import type { Task } from "@prisma/client";
import { db } from "@/lib/db/client";
import { AppError, NotFoundError } from "@/types/errors";
import { writeAuditEvent, type AuditEventInput } from "@/lib/db/audit";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";
import { getAvatarUrl } from "@/lib/storage/media-urls";

export interface ListTasksParams extends PageParams {
  schoolId: string;
  classId?: string;
  status?: string;
  callerRoles?: string[];
  isAuthenticated?: boolean;
}

export interface TaskWithAssignee extends Task {
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
}

const STAFF_ROLES = new Set(['committee', 'teacher', 'school_staff', 'admin']);

export async function listTasks(params: ListTasksParams): Promise<PageResult<TaskWithAssignee>> {
  const limit = resolveLimit(params.limit);
  const isStaff = params.callerRoles?.some(r => STAFF_ROLES.has(r)) ?? false;
  const isAuthed = params.isAuthenticated ?? false;
  const rows = await db.task.findMany({
    where: {
      schoolId: params.schoolId,
      ...(params.classId ? { classId: params.classId } : {}),
      ...(isStaff
        ? (params.status ? { status: params.status } : {})
        : { status: { not: 'draft' } }),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const enriched: TaskWithAssignee[] = await Promise.all(
    rows.map(async (task) => {
      let assigneeName: string | null = null;
      let assigneeAvatarUrl: string | null = null;
      if (task.assignedTo) {
        const profile = await db.profile.findUnique({
          where: { userId: task.assignedTo },
          select: { firstName: true, avatarFileKey: true },
        });
        if (profile) {
          assigneeName = profile.firstName;
          assigneeAvatarUrl = await getAvatarUrl(profile.avatarFileKey ?? null, "tasks-list");
        }
      }
      return { ...task, assigneeName, assigneeAvatarUrl };
    })
  );

  return buildPage(enriched, limit);
}

export async function getTask(id: string): Promise<Task> {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError("Úkol nenalezen");
  return task;
}

export interface TaskDetail extends Task {
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export async function getTaskDetail(id: string): Promise<TaskDetail> {
  const task = await db.task.findUnique({
    where: { id },
    include: { statusEvents: { orderBy: { createdAt: "asc" } } },
  });
  if (!task) throw new NotFoundError("Úkol nenalezen");

  let assigneeName: string | null = null;
  let assigneeAvatarUrl: string | null = null;
  if (task.assignedTo) {
    const profile = await db.profile.findUnique({
      where: { userId: task.assignedTo },
      select: { firstName: true, avatarFileKey: true },
    });
    if (profile) {
      assigneeName = profile.firstName;
      assigneeAvatarUrl = await getAvatarUrl(profile.avatarFileKey ?? null, "task-detail");
    }
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
    assigneeAvatarUrl,
    startedAt: claimedEvent?.createdAt ?? null,
    finishedAt: completedEvent?.createdAt ?? null,
  };
}

export interface ClaimTaskAuditContext {
  tenantId: string;
  schoolId: string;
  requestId?: string;
}

export interface DeleteTaskAuditContext {
  tenantId: string;
  schoolId: string;
  requestId?: string;
}

export async function deleteTask(
  taskId: string,
  actorUserId: string,
  audit: DeleteTaskAuditContext,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("Úkol nenalezen");

    // Delete child records first (Prisma does not cascade automatically without onDelete)
    await tx.taskStatusEvent.deleteMany({ where: { taskId } });
    await tx.taskComment.deleteMany({ where: { taskId } });
    await tx.taskPhoto.deleteMany({ where: { taskId } });
    await tx.taskVideo.deleteMany({ where: { taskId } });
    await tx.task.delete({ where: { id: taskId } });

    await writeAuditEvent(
      {
        tenantId: audit.tenantId,
        schoolId: audit.schoolId,
        actorUserId,
        action: "task.deleted",
        entityType: "task",
        entityId: taskId,
        requestId: audit.requestId,
      },
      tx,
    );
  });
}

const VALID_STATUSES = new Set(["draft", "open", "reserved", "claimed", "completed", "verified"]);

export interface UpdateTaskParams {
  taskId: string;
  actorUserId: string;
  tenantId: string;
  schoolId: string;
  title: string;
  description: string;
  priority: string;
  deadline?: string | null;
  status?: string;
  assignedTo?: string | null;
  requestId?: string;
}

export async function updateTask(params: UpdateTaskParams): Promise<Task> {
  return db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: params.taskId } });
    if (!task) throw new NotFoundError("Úkol nenalezen");

    if (params.deadline !== undefined && params.deadline !== null) {
      const d = new Date(params.deadline);
      if (isNaN(d.getTime())) {
        throw new AppError("VALIDATION_ERROR", "Neplatné datum termínu", 400);
      }
    }

    if (params.status !== undefined && !VALID_STATUSES.has(params.status)) {
      throw new AppError("VALIDATION_ERROR", "Neplatný stav úkolu", 400);
    }

    const updated = await tx.task.update({
      where: { id: params.taskId },
      data: {
        title: params.title,
        description: params.description,
        priority: params.priority,
        deadline: params.deadline ? new Date(params.deadline) : params.deadline === null ? null : undefined,
        ...(params.status !== undefined ? { status: params.status } : {}),
        ...(params.assignedTo !== undefined ? { assignedTo: params.assignedTo } : {}),
      },
    });

    await writeAuditEvent(
      {
        tenantId: params.tenantId,
        schoolId: params.schoolId,
        actorUserId: params.actorUserId,
        action: "task.updated",
        entityType: "task",
        entityId: params.taskId,
        requestId: params.requestId,
      },
      tx,
    );

    return updated;
  });
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
    if (!task) throw new NotFoundError("Úkol nenalezen");

    if (task.status !== "open") {
      throw new AppError("TASK_ALREADY_CLAIMED", "Úkol již není volný", 409);
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
