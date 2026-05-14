import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { publishTask } from "@/lib/db/task-media";
import { toErrorResponse, AppError } from "@/types/errors";

const ALLOWED_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);
const ROUTE = "/api/tasks/[id]/publish";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;
  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles.some((r) => ALLOWED_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Insufficient role", 403);
    }

    let body: { title?: string; description?: string; priority?: string; deadline?: string; tenantId?: string; schoolId?: string };
    try {
      body = await req.json() as typeof body;
    } catch {
      throw new AppError("VALIDATION_ERROR", "Invalid JSON body", 400);
    }

    if (!body.title) throw new AppError("VALIDATION_ERROR", "title is required", 400);
    if (!body.description) throw new AppError("VALIDATION_ERROR", "description is required", 400);

    const tenantId = body.tenantId ?? process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = body.schoolId ?? process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!tenantId) throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);

    const task = await publishTask({
      taskId,
      actorUserId: user.id,
      tenantId,
      schoolId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      deadline: body.deadline,
      requestId,
    });

    logger.info(`${ROUTE}: task published`, { request_id: requestId, task_id: taskId });
    return NextResponse.json({ data: task }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE}: error`, {
        request_id: requestId,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE}: unexpected error`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
