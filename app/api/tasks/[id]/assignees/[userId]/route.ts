import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { awardBadgesForUser } from "@/lib/gamification/award-badges";

const COMMITTEE_ROLES = new Set(["committee", "admin"]);

// Committee manually adds a user as assignee (registration day use-case)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId, userId: targetUserId } = await params;
  const ROUTE = `/api/tasks/${taskId}/assignees/${targetUserId}`;

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles?.some((r: string) => COMMITTEE_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Pouze výbor může přidat řešitele", 403);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";

    // Verify the target user exists
    const profile = await db.profile.findUnique({ where: { userId: targetUserId } });
    if (!profile) {
      throw new AppError("NOT_FOUND", "Uživatel nenalezen", 404);
    }

    await db.$transaction(async (tx) => {
      await tx.taskAssignment.upsert({
        where: { taskId_userId: { taskId, userId: targetUserId } },
        update: {},
        create: { taskId, userId: targetUserId, status: "accepted" },
      });

      // Move task to reserved if still open
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (task?.status === "open") {
        await tx.task.update({ where: { id: taskId }, data: { status: "reserved" } });
        await tx.taskStatusEvent.create({
          data: { taskId, oldStatus: "open", newStatus: "reserved", actorUserId: actor.id },
        });
      }

      await writeAuditEvent(
        {
          tenantId,
          schoolId,
          actorUserId: actor.id,
          action: "task.assignee_added",
          entityType: "task",
          entityId: taskId,
          metadata: { targetUserId },
          requestId,
        },
        tx,
      );
    });

    awardBadgesForUser(targetUserId).catch(() => {});

    logger.info(`${ROUTE} PUT: assignee added`, {
      request_id: requestId,
      task_id: taskId,
      target_user_id: targetUserId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE} PUT: error`, {
        request_id: requestId,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} PUT: unexpected error`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}

// Committee removes an assignee
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId, userId: targetUserId } = await params;
  const ROUTE = `/api/tasks/${taskId}/assignees/${targetUserId}`;

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles?.some((r: string) => COMMITTEE_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Pouze výbor může odebrat řešitele", 403);
    }

    await db.taskAssignment.deleteMany({ where: { taskId, userId: targetUserId } });

    logger.info(`${ROUTE} DELETE: assignee removed`, {
      request_id: requestId,
      task_id: taskId,
      target_user_id: targetUserId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
