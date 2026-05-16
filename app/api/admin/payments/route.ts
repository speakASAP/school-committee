import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/admin/payments";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Payment list requires committee or admin role", 403);
    }

    const schoolId = process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("INTERNAL_ERROR", "DEFAULT_SCHOOL_ID not configured", 500);

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 100;

    const payments = await db.paymentIntent.findMany({
      where: {
        schoolId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const userIds = [...new Set(payments.map((p) => p.userId))];
    const profiles = userIds.length > 0
      ? await db.profile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, firstName: true, lastName: true } })
      : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, `${p.firstName} ${p.lastName}`]));

    const items = payments.map((p) => ({
      id: p.id,
      amountCzk: p.amountCzk,
      currency: p.currency,
      variableSymbol: p.variableSymbol,
      message: p.message,
      status: p.status,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      paidAt: p.paidAt,
      userId: p.userId,
      userName: profileMap.get(p.userId) ?? null,
    }));

    logger.info("admin/payments GET: list fetched", { request_id: requestId, route: ROUTE, count: items.length });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/payments GET: error", { request_id: requestId, route: ROUTE, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/payments GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId), { status: 500 });
  }
}
