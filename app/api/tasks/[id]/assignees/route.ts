import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";

const COMMITTEE_ROLES = new Set(["committee", "admin"]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: taskId } = await params;
  const ROUTE = `/api/tasks/${taskId}/assignees`;

  try {
    const user = await getCurrentUser(requestId);
    if (!user.roles?.some((r: string) => COMMITTEE_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Pouze výbor může zobrazit řešitele", 403);
    }

    const assignments = await db.taskAssignment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });

    const userIds = assignments.map((a) => a.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, firstName: true, lastName: true, titleBefore: true, titleAfter: true },
    });
    const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

    const items = assignments.map((a) => {
      const p = profileMap[a.userId];
      return {
        userId: a.userId,
        status: a.status,
        acceptedAt: a.createdAt,
        completedAt: a.completedAt,
        firstName: p?.firstName ?? "",
        lastName: p?.lastName ?? "",
        titleBefore: p?.titleBefore ?? null,
        titleAfter: p?.titleAfter ?? null,
      };
    });

    logger.info(`${ROUTE} GET: listed ${items.length} assignees`, { request_id: requestId });
    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE} GET: error`, {
        request_id: requestId,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} GET: unexpected error`, {
      request_id: requestId,
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
