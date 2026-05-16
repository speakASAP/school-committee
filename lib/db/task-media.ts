import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import type { Task } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { AppError } from "@/types/errors";

export interface CreateTaskDraftParams {
  schoolId: string;
  classId?: string;
  tenantId: string;
  createdBy: string;
  title: string;
  description: string;
  priority: string;
  deadline?: string;
  audioFileId?: string;
  rawTranscript?: string;
  aiDraftMeta?: Record<string, unknown>;
  // Full MinIO file keys e.g. "tasks/photos/uuid.jpg"
  photoFileKeys?: string[];
  videoFileKeys?: string[];
  requestId?: string;
}

export interface TaskDraftWithMedia extends Task {
  photos: { id: string; fileId: string; fileExt: string; sortOrder: number }[];
  videos: { id: string; fileId: string; fileExt: string; sortOrder: number }[];
}

function parseFileKey(fileKey: string): { fileId: string; fileExt: string } {
  const filename = fileKey.split("/").pop() ?? fileKey;
  const dotIdx = filename.lastIndexOf(".");
  const fileExt = dotIdx >= 0 ? filename.slice(dotIdx + 1) : "bin";
  const fileId = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;
  return { fileId, fileExt };
}

export async function createTaskDraft(params: CreateTaskDraftParams): Promise<TaskDraftWithMedia> {
  return db.$transaction(async (tx) => {
    if (params.deadline) {
      const d = new Date(params.deadline);
      if (isNaN(d.getTime())) {
        throw new AppError("VALIDATION_ERROR", "Invalid deadline date", 400);
      }
    }

    const task = await tx.task.create({
      data: {
        schoolId: params.schoolId,
        classId: params.classId ?? null,
        title: params.title,
        description: params.description,
        priority: params.priority,
        status: "draft",
        createdBy: params.createdBy,
        audioFileId: params.audioFileId ?? null,
        rawTranscript: params.rawTranscript ?? null,
        aiDraftMeta: (params.aiDraftMeta ?? {}) as Prisma.InputJsonValue,
        ...(params.deadline ? { deadline: new Date(params.deadline) } : {}),
      },
    });

    if (params.photoFileKeys?.length) {
      await tx.taskPhoto.createMany({
        data: params.photoFileKeys.map((key, i) => {
          const { fileId, fileExt } = parseFileKey(key);
          return { taskId: task.id, fileId, fileExt, sortOrder: i };
        }),
      });
    }

    if (params.videoFileKeys?.length) {
      await tx.taskVideo.createMany({
        data: params.videoFileKeys.map((key, i) => {
          const { fileId, fileExt } = parseFileKey(key);
          return { taskId: task.id, fileId, fileExt, sortOrder: i };
        }),
      });
    }

    await writeAuditEvent(
      {
        tenantId: params.tenantId,
        schoolId: params.schoolId,
        actorUserId: params.createdBy,
        action: "task.draft_created",
        entityType: "task",
        entityId: task.id,
        requestId: params.requestId,
      },
      tx,
    );

    const withMedia = await tx.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { photos: true, videos: true },
    });
    return withMedia;
  });
}

export interface TaskMediaResult {
  photos: { id: string; fileId: string; fileExt: string; sortOrder: number }[];
  videos: { id: string; fileId: string; fileExt: string; sortOrder: number }[];
}

export async function getTaskMedia(taskId: string): Promise<TaskMediaResult> {
  const [photos, videos] = await Promise.all([
    db.taskPhoto.findMany({ where: { taskId }, orderBy: { sortOrder: "asc" } }),
    db.taskVideo.findMany({ where: { taskId }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { photos, videos };
}

export interface PublishTaskParams {
  taskId: string;
  actorUserId: string;
  tenantId: string;
  schoolId: string;
  title: string;
  description: string;
  priority?: string;
  deadline?: string;
  requestId?: string;
}

export async function publishTask(params: PublishTaskParams): Promise<Task> {
  return db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: params.taskId } });
    if (!task) throw new AppError("NOT_FOUND", "Task not found", 404);
    if (task.status !== "draft") throw new AppError("CONFLICT", "Task is not a draft", 409);

    if (params.deadline) {
      const d = new Date(params.deadline);
      if (isNaN(d.getTime())) {
        throw new AppError("VALIDATION_ERROR", "Invalid deadline date", 400);
      }
    }

    const updated = await tx.task.update({
      where: { id: params.taskId },
      data: {
        status: "open",
        title: params.title,
        description: params.description,
        priority: params.priority ?? task.priority,
        ...(params.deadline ? { deadline: new Date(params.deadline) } : {}),
        audioFileId: null, // GDPR: clear voice reference after publish
        rawTranscript: null, // GDPR: clear transcript after publish
      },
    });

    await writeAuditEvent(
      {
        tenantId: params.tenantId,
        schoolId: params.schoolId,
        actorUserId: params.actorUserId,
        action: "task.published",
        entityType: "task",
        entityId: params.taskId,
        requestId: params.requestId,
      },
      tx,
    );

    return updated;
  });
}
