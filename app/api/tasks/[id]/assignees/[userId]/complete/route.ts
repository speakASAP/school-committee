import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";

const COMMITTEE_ROLES = new Set(["committee", "admin"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId, userId: targetUserId } = await params;
  const ROUTE = `/api/tasks/${taskId}/assignees/${targetUserId}/complete`;

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles?.some((r: string) => COMMITTEE_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Pouze výbor může označit splnění", 403);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";

    const assignment = await db.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId: targetUserId } },
    });
    if (!assignment) {
      throw new AppError("NOT_FOUND", "Přiřazení nenalezeno", 404);
    }
    if (assignment.status === "completed") {
      throw new AppError("VALIDATION_ERROR", "Toto splnění bylo již zaznamenáno", 409);
    }

    await db.$transaction(async (tx) => {
      await tx.taskAssignment.update({
        where: { taskId_userId: { taskId, userId: targetUserId } },
        data: { status: "completed", completedBy: actor.id, completedAt: new Date() },
      });

      await writeAuditEvent(
        {
          tenantId,
          schoolId,
          actorUserId: actor.id,
          action: "task.assignment_completed",
          entityType: "task",
          entityId: taskId,
          metadata: { targetUserId },
          requestId,
        },
        tx,
      );
    });

    // Award badges to the person who completed the task
    awardBadgesForUser(targetUserId).catch(() => {});

    logger.info(`${ROUTE}: assignment completed`, {
      request_id: requestId,
      task_id: taskId,
      target_user_id: targetUserId,
      actor_id: actor.id,
    });

    return NextResponse.json({ success: true }, { status: 200 });
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
