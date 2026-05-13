import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { moderateFeedback } from "@/lib/db/feedback";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

const ALLOWED_MODERATE_STATUSES = ["in_review", "resolved", "archived"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  const ROUTE = `/api/feedback/${id}`;

  try {
    const user = await getCurrentUser(requestId);

    if (!user.roles.includes("committee") && !user.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Moderation access requires committee or admin role", 403);
    }

    const item = await db.feedbackItem.findUnique({ where: { id } });
    if (!item) throw new AppError("NOT_FOUND", "Feedback item not found", 404);

    // Never expose userId for anonymous feedback — to anyone
    const safeItem = {
      ...item,
      userId: item.isAnonymous ? null : item.userId,
    };

    return NextResponse.json({ item: safeItem }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("feedback GET: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("feedback GET: unexpected error", {
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id } = await params;
  const ROUTE = `/api/feedback/${id}`;

  try {
    const user = await getCurrentUser(requestId);

    if (!user.roles.includes("committee") && !user.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Moderation access requires committee or admin role", 403);
    }

    const body = await req.json() as { status?: string; tenantId?: string; schoolId?: string };

    if (!body.status || !ALLOWED_MODERATE_STATUSES.includes(body.status)) {
      throw new AppError("VALIDATION_ERROR", `status must be one of: ${ALLOWED_MODERATE_STATUSES.join(", ")}`, 400);
    }

    const updated = await moderateFeedback(id, user.id, body.status);

    if (body.tenantId && body.schoolId) {
      await writeAuditEvent({
        tenantId: body.tenantId,
        schoolId: body.schoolId,
        actorUserId: user.id,
        action: "feedback.moderated",
        entityType: "feedback_item",
        entityId: id,
        metadata: { newStatus: body.status },
        requestId,
      });
    }

    logger.info("feedback PATCH: feedback moderated", {
      request_id: requestId,
      route: ROUTE,
      feedback_id: id,
      new_status: body.status,
    });

    return NextResponse.json({ item: { id: updated.id, status: updated.status } }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("feedback PATCH: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("feedback PATCH: unexpected error", {
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
