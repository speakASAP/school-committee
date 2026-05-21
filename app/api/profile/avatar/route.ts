import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { writeAuditEvent } from "@/lib/db/audit";
import { getProfile } from "@/lib/db/profiles";
import { getAvatarUrl } from "@/lib/storage/media-urls";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/profile/avatar";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    const body = await req.json() as { fileKey?: string };

    if (!body.fileKey?.trim()) {
      throw new AppError("VALIDATION_ERROR", "fileKey je povinný", 400);
    }
    if (!body.fileKey.startsWith("profiles/avatars/")) {
      throw new AppError("VALIDATION_ERROR", "Neplatný klíč souboru", 400);
    }

    const profile = await getProfile(user.id);

    await db.profile.update({
      where: { userId: user.id },
      data: { avatarFileKey: body.fileKey.trim() },
    });

    await writeAuditEvent({
      tenantId: profile.tenantId,
      schoolId: profile.schoolId,
      actorUserId: user.id,
      action: "profile.avatar_updated",
      entityType: "profile",
      entityId: user.id,
      requestId,
    });

    const avatarUrl = await getAvatarUrl(body.fileKey.trim(), requestId);
    logger.info(`${ROUTE} POST: avatar saved`, { request_id: requestId, user_id: user.id });
    return NextResponse.json({ avatarUrl }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE} POST: error`, { request_id: requestId, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} POST: unexpected`, { request_id: requestId, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const user = await getCurrentUser(requestId);
    const profile = await getProfile(user.id);

    await db.profile.update({
      where: { userId: user.id },
      data: { avatarFileKey: null },
    });

    await writeAuditEvent({
      tenantId: profile.tenantId,
      schoolId: profile.schoolId,
      actorUserId: user.id,
      action: "profile.avatar_deleted",
      entityType: "profile",
      entityId: user.id,
      requestId,
    });

    logger.info(`${ROUTE} DELETE: avatar removed`, { request_id: requestId, user_id: user.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error(`${ROUTE} DELETE: error`, { request_id: requestId, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error(`${ROUTE} DELETE: unexpected`, { request_id: requestId, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
