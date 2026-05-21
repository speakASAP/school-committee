import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { listUsers } from "@/lib/db/users";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/admin/users";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);
    if (!actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Tato akce vyžaduje roli administrátora", 403);
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const schoolId = searchParams.get("schoolId") ?? undefined;

    if (!tenantId) {
      throw new AppError("VALIDATION_ERROR", "ID nájemce je povinné", 400);
    }

    const users = await listUsers(tenantId, schoolId);

    return NextResponse.json({ users }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("users GET: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("users GET: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
