import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { listTaskComments, createTaskComment } from "@/lib/db/task-comments";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

const ROUTE = "/api/tasks/[id]/comments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const { id: taskId } = await params;
    const comments = await listTaskComments(taskId, requestId);

    return NextResponse.json(
      {
        items: comments.map((c) => ({
          id: c.id,
          taskId: c.taskId,
          body: c.body,
          createdAt: c.createdAt,
          authorFirstName: c.authorFirstName,
          authorAvatarUrl: c.authorAvatarUrl,
        })),
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} GET: unexpected`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const { id: taskId } = await params;
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    let body: { body?: string };
    try {
      body = await req.json() as { body?: string };
    } catch {
      throw new AppError("VALIDATION_ERROR", "Neplatný formát JSON", 400);
    }
    if (!body.body?.trim()) {
      throw new AppError("VALIDATION_ERROR", "Text komentáře je povinný", 400);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!tenantId || !schoolId) {
      throw new AppError("INTERNAL_ERROR", "Chybná konfigurace serveru", 500);
    }

    const comment = await createTaskComment(
      taskId,
      user.id,
      body.body.trim(),
      tenantId,
      schoolId,
      requestId,
    );

    logger.info(`${ROUTE} POST: comment created`, {
      request_id: requestId,
      task_id: taskId,
      comment_id: comment.id,
    });

    return NextResponse.json(
      {
        id: comment.id,
        taskId: comment.taskId,
        body: comment.body,
        createdAt: comment.createdAt,
        authorFirstName: comment.authorFirstName,
        authorAvatarUrl: comment.authorAvatarUrl,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} POST: unexpected`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
