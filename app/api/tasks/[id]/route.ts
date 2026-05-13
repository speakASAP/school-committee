import { NextRequest, NextResponse } from "next/server";
import { tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { getTaskDetail } from "@/lib/db/tasks";
import { toErrorResponse, AppError } from "@/types/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await tryGetCurrentUser(requestId);
    const authed = user !== null;
    const { id } = await params;
    const task = await getTaskDetail(id);

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
      // Only expose assignee details to authenticated users
      assigneeName: authed ? task.assigneeName : null,
      startedAt: authed ? task.startedAt : null,
      finishedAt: authed ? task.finishedAt : null,
    };

    return NextResponse.json({ task: safeTask }, { status: 200 });
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
