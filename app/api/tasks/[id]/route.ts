import { NextRequest, NextResponse } from "next/server";
import { tryGetCurrentUser, getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getTaskDetail, deleteTask, updateTask } from "@/lib/db/tasks";
import { getTaskMedia } from "@/lib/db/task-media";
import { getMediaPresignedUrls } from "@/lib/storage/media-urls";
import { toErrorResponse, AppError } from "@/types/errors";

const STAFF_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  const ROUTE = `/api/tasks/${id}`;

  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => STAFF_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Nedostatečná oprávnění", 403);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!tenantId || !schoolId) {
      throw new AppError("INTERNAL_ERROR", "Chybná konfigurace serveru", 500);
    }

    await deleteTask(id, user.id, { tenantId, schoolId, requestId });

    logger.info(`${ROUTE} DELETE: task deleted`, { request_id: requestId, task_id: id, actor: user.id });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE} DELETE: error`, {
        request_id: requestId,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} DELETE: unexpected error`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  const ROUTE = `/api/tasks/${id}`;

  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => STAFF_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Nedostatečná oprávnění", 403);
    }

    let body: { title?: string; description?: string; priority?: string; deadline?: string | null };
    try {
      body = await req.json() as typeof body;
    } catch {
      throw new AppError("VALIDATION_ERROR", "Neplatné tělo požadavku", 400);
    }

    if (!body.title?.trim()) throw new AppError("VALIDATION_ERROR", "Název úkolu je povinný", 400);
    if (!body.description?.trim()) throw new AppError("VALIDATION_ERROR", "Popis úkolu je povinný", 400);
    if (!body.priority) throw new AppError("VALIDATION_ERROR", "Priorita úkolu je povinná", 400);

    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!tenantId || !schoolId) {
      throw new AppError("INTERNAL_ERROR", "Chybná konfigurace serveru", 500);
    }

    const task = await updateTask({
      taskId: id,
      actorUserId: user.id,
      tenantId,
      schoolId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      deadline: body.deadline,
      requestId,
    });

    logger.info(`${ROUTE} PATCH: task updated`, { request_id: requestId, task_id: id });
    return NextResponse.json({ task: { id: task.id, title: task.title, status: task.status } }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE} PATCH: error`, {
        request_id: requestId,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} PATCH: unexpected error`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  const ROUTE = `/api/tasks/${id}`;

  try {
    const user = await tryGetCurrentUser(requestId);
    const authed = user !== null;
    const isStaff = user !== null && user.roles.some((r) => STAFF_ROLES.has(r));
    const task = await getTaskDetail(id);

    if (task.status === "draft" && !isStaff) {
      throw new AppError("NOT_FOUND", "Úkol nenalezen", 404);
    }

    const media = await getTaskMedia(id);
    const mediaUrls = await getMediaPresignedUrls(media, requestId);

    const safeTask = {
      id: task.id,
      schoolId: task.schoolId,
      classId: task.classId,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      isClaimed: task.assignedTo !== null,
      assigneeName: authed ? task.assigneeName : null,
      assigneeAvatarUrl: authed ? task.assigneeAvatarUrl : null,
      startedAt: authed ? task.startedAt : null,
      finishedAt: authed ? task.finishedAt : null,
      photos: mediaUrls.photos,
      videos: mediaUrls.videos,
    };

    return NextResponse.json({ task: safeTask }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("tasks/[id] GET: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("tasks/[id] GET: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
