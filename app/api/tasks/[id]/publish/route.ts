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
      throw new AppError("FORBIDDEN", "Nedostatečná oprávnění", 403);
    }

    let body: { title?: string; description?: string; priority?: string; deadline?: string; tenantId?: string; schoolId?: string } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text) as typeof body;
    } catch {
      throw new AppError("VALIDATION_ERROR", "Neplatné tělo požadavku", 400);
    }

    const tenantId = body.tenantId ?? process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = body.schoolId ?? process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!tenantId) throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);

    // If title/description not provided, fetch from existing task
    let title = body.title;
    let description = body.description;
    if (!title || !description) {
      const existing = await import("@/lib/db/tasks").then(m => m.getTask(taskId));
      title = title ?? existing.title;
      description = description ?? existing.description;
    }

    const task = await publishTask({
      taskId,
      actorUserId: user.id,
      tenantId,
      schoolId,
      title,
      description,
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
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
