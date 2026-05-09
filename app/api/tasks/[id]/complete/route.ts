import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { getTask } from "@/lib/db/tasks";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    const { id: taskId } = await params;
    const body = await req.json().catch(() => ({})) as { tenantId?: string; schoolId?: string; note?: string };

    if (!body.tenantId || !body.schoolId) {
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
      tenantId: body.tenantId,
      schoolId: body.schoolId,
      actorUserId: user.id,
      action: "task.completion_submitted",
      entityType: "task",
      entityId: taskId,
      requestId,
    });

    return NextResponse.json({ task: { id: updated.id, status: updated.status } }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
