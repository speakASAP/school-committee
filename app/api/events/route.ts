import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, tryGetCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { listEvents, createEvent } from "@/lib/db/events";
import { writeAuditEvent } from "@/lib/db/audit";
import { requireApproved } from "@/lib/auth/require-approved";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/events";
const STAFF_ROLES = ["committee", "teacher", "school_staff", "admin"];

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId") || process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);

    const user = await tryGetCurrentUser(requestId);

    const result = await listEvents({
      schoolId,
      upcoming: searchParams.get("upcoming") !== "false",
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const safeItems = result.items.map((event) => ({
      ...event,
      isRegistered: user ? event.registeredUserIds.includes(user.id) : false,
      registeredUserIds: undefined, // strip internal list from response
    }));

    return NextResponse.json({ items: safeItems, nextCursor: result.nextCursor });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("events GET: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const user = await getCurrentUser(requestId);
    requireApproved(user);

    if (!user.roles.some((r) => STAFF_ROLES.includes(r))) {
      throw new AppError("FORBIDDEN", "Události mohou vytvářet pouze výbor, učitelé, správci školy nebo administrátoři", 403);
    }

    const body = await req.json() as {
      title?: string;
      description?: string;
      startsAt?: string;
      endsAt?: string;
      location?: string;
      capacity?: number;
      schoolId?: string;
    };

    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);
    if (!body.title?.trim()) throw new AppError("VALIDATION_ERROR", "Název události je povinný", 400);
    if (!body.startsAt) throw new AppError("VALIDATION_ERROR", "Datum začátku události je povinné", 400);

    const startsAt = new Date(body.startsAt);
    if (isNaN(startsAt.getTime())) throw new AppError("VALIDATION_ERROR", "Datum začátku musí být platné datum ve formátu ISO", 400);

    const endsAt = body.endsAt ? new Date(body.endsAt) : undefined;
    if (endsAt && isNaN(endsAt.getTime())) throw new AppError("VALIDATION_ERROR", "Datum konce musí být platné datum ve formátu ISO", 400);

    const tenantId = process.env.DEFAULT_TENANT_ID ?? schoolId;

    const event = await createEvent({
      schoolId,
      createdBy: user.id,
      title: body.title.trim(),
      description: body.description?.trim(),
      startsAt,
      endsAt,
      location: body.location?.trim(),
      capacity: body.capacity,
    });

    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: user.id,
      action: "event.created",
      entityType: "event",
      entityId: event.id,
      requestId,
    });

    logger.info("events POST: event created", { request_id: requestId, route: ROUTE, user_id: user.id, event_id: event.id });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("events POST: error", { request_id: requestId, route: ROUTE, error_code: err.code });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("events POST: unexpected error", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
