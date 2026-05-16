import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { listIdeas, createIdea } from "@/lib/db/ideas";
import { writeAuditEvent } from "@/lib/db/audit";
import { requireApproved } from "@/lib/auth/require-approved";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/ideas";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);

    const user = await tryGetCurrentUser(requestId);

    const result = await listIdeas({
      schoolId,
      classId: searchParams.get("classId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    // Only expose voter IDs to authenticated users
    const safeItems = result.items.map((idea) => ({
      ...idea,
      voterIds: user ? idea.voterIds : [],
      hasVoted: user ? idea.voterIds.includes(user.id) : false,
    }));

    return NextResponse.json({ items: safeItems, nextCursor: result.nextCursor });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas GET: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const body = await req.json() as {
      title?: string;
      description?: string;
      classId?: string;
      budgetNeededCzk?: number;
      schoolId?: string;
    };

    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    if (!body.title?.trim()) throw new AppError("VALIDATION_ERROR", "title is required", 400);
    if (!body.description?.trim()) throw new AppError("VALIDATION_ERROR", "description is required", 400);
    if (body.budgetNeededCzk !== undefined && (typeof body.budgetNeededCzk !== "number" || body.budgetNeededCzk < 0)) {
      throw new AppError("VALIDATION_ERROR", "budgetNeededCzk must be a non-negative number", 400);
    }

    const tenantId = process.env.DEFAULT_TENANT_ID ?? schoolId;

    const idea = await createIdea({
      schoolId,
      classId: body.classId,
      submittedBy: user.id,
      title: body.title.trim(),
      description: body.description.trim(),
      budgetNeededCzk: body.budgetNeededCzk,
    });

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: user.id,
      action: "idea.submitted",
      entityType: "idea",
      entityId: idea.id,
      requestId,
    });

    logger.info("ideas POST: idea created", { request_id: requestId, route: ROUTE, user_id: user.id, idea_id: idea.id });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("ideas POST: error", { request_id: requestId, route: ROUTE, error_code: err.code });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("ideas POST: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
