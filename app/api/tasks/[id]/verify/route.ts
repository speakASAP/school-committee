import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getTask } from "@/lib/db/tasks";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";

const STAFF_ROLES = new Set(["committee", "teacher", "school_staff", "admin"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;
  const ROUTE = `/api/tasks/${taskId}/verify`;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);
    if (!user.roles.some((r) => STAFF_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Tato akce vyžaduje roli pracovníka školy", 403);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!tenantId || !schoolId) {
      throw new AppError("INTERNAL_ERROR", "Chybná konfigurace serveru", 500);
    }

    const task = await getTask(taskId);
    if (task.status !== "completed") {
      throw new AppError("VALIDATION_ERROR", "Úkol musí být ve stavu 'splněno' pro ověření", 400);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.task.update({
        where: { id: taskId },
        data: { status: "verified", verifiedBy: user.id },
      });

      await tx.taskStatusEvent.create({
        data: {
          taskId,
          oldStatus: "completed",
          newStatus: "verified",
          actorUserId: user.id,
        },
      });

      await writeAuditEvent(
        {
          tenantId,
          schoolId,
          actorUserId: user.id,
          action: "task.verified",
          entityType: "task",
          entityId: taskId,
          requestId,
        },
        tx,
      );

      return result;
    });

    awardBadgesForUser(user.id).catch(() => {});

    logger.info(`${ROUTE}: task verified`, { request_id: requestId, task_id: taskId, actor: user.id });
    return NextResponse.json({ task: { id: updated.id, status: updated.status } }, { status: 200 });
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
