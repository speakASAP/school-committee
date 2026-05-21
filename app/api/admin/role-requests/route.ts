import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";
import { requireRole } from "@/lib/auth/require-role";

const ROUTE = "/api/admin/role-requests";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);
    requireRole(actor, ["school_staff", "admin"]);

    const statusFilter = new URL(req.url).searchParams.get("status") ?? "pending";

    const requests = await db.roleUpgradeRequest.findMany({
      where: { status: statusFilter },
      orderBy: { createdAt: "asc" },
    });

    // Enrich with profile names
    const userIds = requests.map((r) => r.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, firstName: true, lastName: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const enriched = requests.map((r) => ({
      ...r,
      firstName: profileMap.get(r.userId)?.firstName ?? "",
      lastName: profileMap.get(r.userId)?.lastName ?? "",
    }));

    return NextResponse.json({ requests: enriched }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/role-requests GET: error", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/role-requests GET: unexpected error", {
      request_id: requestId,
      route: ROUTE,
      error_code: "UNEXPECTED_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId),
      { status: 500 },
    );
  }
}
