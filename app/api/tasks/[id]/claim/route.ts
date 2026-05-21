import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { claimTask } from "@/lib/db/tasks";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;
  const ROUTE = `/api/tasks/${taskId}/claim`;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const body = await req.json().catch(() => ({})) as { tenantId?: string; schoolId?: string };

    const tenantId = body.tenantId || process.env.DEFAULT_TENANT_ID || "";
    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID || "";

    if (!tenantId || !schoolId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce a školy jsou povinná", 400);
    }

    const task = await claimTask(taskId, user.id, {
      tenantId,
      schoolId,
      requestId,
    });

    logger.info("tasks/claim: task claimed", {
      request_id: requestId,
      route: ROUTE,
      task_id: taskId,
      user_id: user.id,
    });

    return NextResponse.json(
      { task: { id: task.id, status: task.status, isClaimed: true } },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("tasks/claim: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("tasks/claim: unexpected error", {
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
