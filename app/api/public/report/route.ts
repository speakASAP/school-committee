import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import { toErrorResponse, AppError } from "@/types/errors";
import { getOrCreateRequestId } from "@/lib/request-id";

const ROUTE = "/api/public/report";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);

    const [collectedAgg, spentAgg, expenses, completedTaskCount] = await Promise.all([
      db.paymentIntent.aggregate({
        where: { schoolId, status: "paid" },
        _sum: { amountCzk: true },
      }),
      db.expense.aggregate({
        where: { schoolId },
        _sum: { amountCzk: true },
      }),
      db.expense.findMany({
        where: { schoolId, publicVisible: true },
        select: { id: true, title: true, category: true, amountCzk: true, spentAt: true },
        orderBy: { spentAt: "desc" },
        take: 50,
      }),
      db.task.count({ where: { schoolId, status: "completed" } }),
    ]);

    const totalCollectedCzk = collectedAgg._sum.amountCzk ?? 0;
    const totalSpentCzk = spentAgg._sum.amountCzk ?? 0;

    // All tasks for the report (all statuses), ordered by created_at
    const allTaskRows = await db.task.findMany({
      where: { schoolId },
      include: { statusEvents: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    const allTasks = await Promise.all(
      allTaskRows.map(async (task) => {
        let responsibleName: string | null = null;
        const actorId = task.assignedTo ?? task.createdBy;
        if (actorId) {
          const profile = await db.profile.findUnique({
            where: { userId: actorId },
            select: { firstName: true, lastName: true },
          });
          if (profile) {
            responsibleName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.firstName;
          }
        }
        const finishedEvent = task.statusEvents.find(
          (e) => e.newStatus === "completed" || e.newStatus === "verified"
        );
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          responsibleName,
          finishedAt: finishedEvent?.createdAt ?? null,
          createdAt: task.createdAt,
        };
      })
    );

    return NextResponse.json({
      totalCollectedCzk,
      totalSpentCzk,
      balanceCzk: totalCollectedCzk - totalSpentCzk,
      completedTaskCount,
      expenses,
      allTasks,
    });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("public/report: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("public/report: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
