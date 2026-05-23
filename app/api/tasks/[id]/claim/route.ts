import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { getTask } from "@/lib/db/tasks";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";

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

    const task = await getTask(taskId);

    if (task.status === "draft" || task.status === "verified") {
      throw new AppError("VALIDATION_ERROR", "Tento úkol nelze přijmout", 400);
    }

    // Check if user already accepted this task
    const existing = await db.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId: user.id } },
    });
    if (existing) {
      throw new AppError("TASK_ALREADY_CLAIMED", "Tento úkol jste již přijali", 409);
    }

    await db.$transaction(async (tx) => {
      await tx.taskAssignment.create({
        data: { taskId, userId: user.id, status: "accepted" },
      });

      // Move task from open → reserved (claimed) on first acceptor
      if (task.status === "open") {
        await tx.task.update({ where: { id: taskId }, data: { status: "reserved" } });
        await tx.taskStatusEvent.create({
          data: { taskId, oldStatus: "open", newStatus: "reserved", actorUserId: user.id },
        });
      }

      await writeAuditEvent(
        {
          tenantId,
          schoolId,
          actorUserId: user.id,
          action: "task.claimed",
          entityType: "task",
          entityId: taskId,
          requestId,
        },
        tx,
      );
    });

    awardBadgesForUser(user.id).catch(() => {});

    logger.info("tasks/claim: task accepted", {
      request_id: requestId,
      route: ROUTE,
      task_id: taskId,
      user_id: user.id,
    });

    return NextResponse.json(
      { task: { id: taskId, status: task.status === "open" ? "reserved" : task.status, isClaimed: true } },
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
