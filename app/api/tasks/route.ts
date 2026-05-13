import { NextRequest, NextResponse } from "next/server";
import { tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { listTasks } from "@/lib/db/tasks";
import { toErrorResponse, AppError } from "@/types/errors";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await tryGetCurrentUser(requestId);
    const authed = user !== null;

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || process.env.DEFAULT_SCHOOL_ID;

    if (!schoolId) {
      throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    }

    const result = await listTasks({
      schoolId,
      classId: searchParams.get("classId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const safeItems = result.items.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt,
      isClaimed: task.assignedTo !== null,
      // Only expose assignee name to authenticated users
      assigneeName: authed ? task.assigneeName : null,
    }));

    return NextResponse.json({ items: safeItems, nextCursor: result.nextCursor }, { status: 200 });
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
