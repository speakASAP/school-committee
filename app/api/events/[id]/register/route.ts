import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { getEvent, registerForEvent, cancelEventRegistration, getRegistration } from "@/lib/db/events";
import { writeAuditEvent } from "@/lib/db/audit";
import { requireApproved } from "@/lib/auth/require-approved";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/events/[id]/register";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: eventId } = await params;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const event = await getEvent(eventId);
    if (!event) throw new AppError("NOT_FOUND", "Event not found", 404);

    // Check capacity
    if (event.capacity !== null) {
      const existing = await getRegistration(eventId, user.id);
      if (!existing || existing.status !== "registered") {
        const { db } = await import("@/lib/db/client");
        const count = await db.eventRegistration.count({ where: { eventId, status: "registered" } });
        if (count >= event.capacity) {
          throw new AppError("FORBIDDEN", "Event is at full capacity", 403);
        }
      }
    }

    await registerForEvent(eventId, user.id);

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? event.schoolId,
      schoolId: event.schoolId,
      actorUserId: user.id,
      action: "event.registered",
      entityType: "event",
      entityId: eventId,
      requestId,
    });

    logger.info("events/register POST: registered", { request_id: requestId, route: ROUTE, user_id: user.id, event_id: eventId });
    return NextResponse.json({ ok: true, status: "registered" });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("events/register POST: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const { id: eventId } = await params;

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    const event = await getEvent(eventId);
    if (!event) throw new AppError("NOT_FOUND", "Event not found", 404);

    await cancelEventRegistration(eventId, user.id);

    await writeAuditEvent({
      tenantId: process.env.DEFAULT_TENANT_ID ?? event.schoolId,
      schoolId: event.schoolId,
      actorUserId: user.id,
      action: "event.registration_cancelled",
      entityType: "event",
      entityId: eventId,
      requestId,
    });

    logger.info("events/register DELETE: cancelled", { request_id: requestId, route: ROUTE, user_id: user.id, event_id: eventId });
    return NextResponse.json({ ok: true, status: "cancelled" });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("events/register DELETE: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
