import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { deleteUserFromApp } from "@/lib/db/users";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";
import { getAccessToken, clearAuthCookies } from "@/lib/auth/session";

const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_BASE_URL ?? "";
const ROUTE = "/api/account/delete-request";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const actor = await getCurrentUser(requestId);
    const body = (await req.json()) as { tenantId?: string; schoolId?: string; reason?: string };
    const tenantId = body.tenantId || process.env.DEFAULT_TENANT_ID || "";
    const schoolId = body.schoolId || process.env.DEFAULT_SCHOOL_ID;
    if (!tenantId) throw new AppError("VALIDATION_ERROR", "tenantId is required", 400);
    await writeAuditEvent({
      tenantId,
      schoolId,
      actorUserId: actor.id,
      action: "account.deleted",
      entityType: "profile",
      entityId: actor.id,
      metadata: { reason: body.reason ?? null, email: actor.email },
      requestId,
    });
    await deleteUserFromApp(actor.id, tenantId);

    // Revoke session at auth-microservice and clear cookies
    const token = await getAccessToken();
    if (token && AUTH_SERVICE_BASE_URL) {
      try {
        await fetch(`${AUTH_SERVICE_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(3000),
        });
      } catch (err) {
        logger.error("delete-request: failed to revoke session at auth-microservice", {
          request_id: requestId,
          route: ROUTE,
          error_message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    await clearAuthCookies();

    logger.info("delete-request: account deleted and session cleared", {
      request_id: requestId,
      route: ROUTE,
      user_id: actor.id,
    });
    return NextResponse.json(
      { deleted: true },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("delete-request: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("delete-request: unexpected error", {
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
