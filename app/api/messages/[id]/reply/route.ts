import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

const COMMITTEE_ROLES = new Set(["committee", "admin"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: parentId } = await params;
  const ROUTE = `/api/messages/${parentId}/reply`;

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles?.some((r: string) => COMMITTEE_ROLES.has(r))) {
      throw new AppError("FORBIDDEN", "Pouze výbor může odpovídat na zprávy", 403);
    }

    const body = await req.json() as { body?: string };
    if (!body.body?.trim()) {
      throw new AppError("VALIDATION_ERROR", "Odpověď nesmí být prázdná", 400);
    }

    const parent = await db.message.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError("NOT_FOUND", "Zpráva nenalezena", 404);

    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";

    const reply = await db.message.create({
      data: {
        schoolId,
        fromUserId: actor.id,
        parentId,
        body: body.body.trim(),
        isFromCommittee: true,
      },
    });

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? schoolId,
      schoolId,
      actorUserId: actor.id,
      action: "message.reply_sent",
      entityType: "message",
      entityId: reply.id,
      requestId,
    });

    logger.info(`${ROUTE}: reply sent`, { request_id: requestId, reply_id: reply.id });
    return NextResponse.json({ id: reply.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE}: unexpected error`, { request_id: requestId, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
