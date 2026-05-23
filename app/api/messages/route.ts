import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireApproved } from "@/lib/auth/require-approved";

const ROUTE = "/api/messages";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const body = await req.json() as { body?: string };
    if (!body.body?.trim()) {
      throw new AppError("VALIDATION_ERROR", "Zpráva nesmí být prázdná", 400);
    }

    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!schoolId) throw new AppError("INTERNAL_ERROR", "Chybná konfigurace", 500);

    const msg = await db.message.create({
      data: { schoolId, fromUserId: user.id, body: body.body.trim(), isFromCommittee: false },
    });

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? schoolId,
      schoolId,
      actorUserId: user.id,
      action: "message.sent",
      entityType: "message",
      entityId: msg.id,
      requestId,
    });

    logger.info(`${ROUTE} POST: message sent`, { request_id: requestId, msg_id: msg.id });
    return NextResponse.json({ id: msg.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} POST: unexpected error`, { request_id: requestId, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";

    // Return the full thread for this user (their messages + committee replies)
    const messages = await db.message.findMany({
      where: {
        schoolId,
        OR: [
          { fromUserId: user.id, isFromCommittee: false },
          { isFromCommittee: true, parent: { fromUserId: user.id } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark committee replies as read
    const unreadIds = messages
      .filter((m) => m.isFromCommittee && !m.readAt)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await db.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } });
    }

    return NextResponse.json({ items: messages }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
