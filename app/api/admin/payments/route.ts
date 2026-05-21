import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/admin/payments";

const ALLOWED_SORT = new Set(["createdAt", "paidAt", "amountCzk", "status", "userName"]);

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Přístup k platbám vyžaduje roli výboru nebo administrátora", 403);
    }

    const schoolId = process.env.DEFAULT_SCHOOL_ID;
    if (!schoolId) throw new AppError("INTERNAL_ERROR", "DEFAULT_SCHOOL_ID not configured", 500);

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || undefined;
    const schoolYear = searchParams.get("schoolYear") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 500;
    const rawSort = searchParams.get("sortBy") ?? "createdAt";
    const sortBy = ALLOWED_SORT.has(rawSort) ? rawSort : "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const payments = await db.paymentIntent.findMany({
      where: {
        schoolId,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(schoolYear ? { message: { contains: schoolYear } } : {}),
      },
      orderBy: sortBy === "userName"
        ? { createdAt: sortDir }  // userName sort applied in JS after join
        : { [sortBy]: sortDir },
      take: limit,
    });

    const userIds = [...new Set(payments.map((p) => p.userId))];

    const [profiles, children] = await Promise.all([
      userIds.length > 0
        ? db.profile.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? db.child.findMany({
            where: { parentUserId: { in: userIds } },
            select: { parentUserId: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId, { name: `${p.firstName} ${p.lastName}`, lastName: p.lastName }]));
    const childrenMap = new Map<string, string[]>();
    for (const c of children) {
      const list = childrenMap.get(c.parentUserId) ?? [];
      list.push(c.firstName);
      childrenMap.set(c.parentUserId, list);
    }

    let items = payments.map((p) => ({
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
      userName: profileMap.get(p.userId)?.name ?? null,
      childrenNames: childrenMap.get(p.userId) ?? [],
    }));

    if (sortBy === "userName") {
      items.sort((a, b) => {
        const cmp = (a.userName ?? "").localeCompare(b.userName ?? "", "cs");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    logger.info("admin/payments GET: list fetched", { request_id: requestId, route: ROUTE, count: items.length });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("admin/payments GET: error", { request_id: requestId, route: ROUTE, error_code: err.code, error_message: err.message });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("admin/payments GET: unexpected", { request_id: requestId, route: ROUTE, error_message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(toErrorResponse(new AppError("INTERNAL_ERROR", "Neočekávaná chyba", 500), requestId), { status: 500 });
  }
}
