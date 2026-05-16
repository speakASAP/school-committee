import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getTask } from "@/lib/db/tasks";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;
  const ROUTE = `/api/tasks/${taskId}/complete`;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);
    const body = await req.json().catch(() => ({})) as { tenantId?: string; schoolId?: string; note?: string };

    const tenantId = body.tenantId || process.env.DEFAULT_TENANT_ID || "";
    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID || "";

    if (!tenantId || !schoolId) {
      throw new AppError("VALIDATION_ERROR", "tenantId and schoolId are required", 400);
    }

    const task = await getTask(taskId);

    // Only the assignee can submit completion
    if (task.assignedTo !== user.id) {
      throw new AppError("FORBIDDEN", "Only the task assignee can submit completion", 403);
    }
    if (task.status !== "reserved") {
      throw new AppError("VALIDATION_ERROR", "Task must be in reserved status to submit completion", 400);
    }

    const updated = await db.task.update({
      where: { id: taskId },
      data: { status: "completed" },
    });

    await db.taskStatusEvent.create({
      data: {
        taskId,
        oldStatus: "reserved",
        newStatus: "completed",
        actorUserId: user.id,
        reason: body.note ?? null,
      },
    });

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: user.id,
      action: "task.completion_submitted",
      entityType: "task",
      entityId: taskId,
      requestId,
    });

    logger.info("tasks/complete: task marked completed", {
      request_id: requestId,
      route: ROUTE,
      task_id: taskId,
      user_id: user.id,
    });

    return NextResponse.json({ task: { id: updated.id, status: updated.status } }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("tasks/complete: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("tasks/complete: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
