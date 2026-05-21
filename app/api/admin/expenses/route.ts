import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";
import { createExpense, listExpenses } from "@/lib/db/expenses";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

const ROUTE = "/api/admin/expenses";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Vytváření výdajů vyžaduje roli výboru nebo administrátora", 403);
    }

    const body = await req.json() as {
      schoolId?: string;
      title?: string;
      description?: string;
      category?: string;
      amountCzk?: number;
      spentAt?: string;
      publicVisible?: boolean;
      tenantId?: string;
    };

    if (!body.schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);
    if (!body.title?.trim()) throw new AppError("VALIDATION_ERROR", "Název výdaje je povinný", 400);
    if (!body.category) throw new AppError("VALIDATION_ERROR", "Kategorie výdaje je povinná", 400);
    if (typeof body.amountCzk !== "number" || body.amountCzk <= 0) {
      throw new AppError("VALIDATION_ERROR", "Částka musí být kladné číslo", 400);
    }
    if (!body.spentAt) throw new AppError("VALIDATION_ERROR", "Datum výdaje je povinné", 400);

    const expense = await createExpense({
      schoolId: body.schoolId,
      title: body.title,
      description: body.description,
      category: body.category,
      amountCzk: body.amountCzk,
      spentAt: new Date(body.spentAt),
      publicVisible: body.publicVisible ?? false,
      createdBy: actor.id,
    });

    if (body.tenantId) {
      await writeAuditEvent({
        tenantId: body.tenantId,
        schoolId: body.schoolId,
        actorUserId: actor.id,
        action: "expense.created",
        entityType: "expense",
        entityId: expense.id,
        requestId,
      });
    }

    logger.info("expenses: expense created", {
      request_id: requestId,
      route: ROUTE,
      expense_id: expense.id,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("expenses POST: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("expenses POST: unexpected error", {
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

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Přístup k výdajům vyžaduje roli výboru nebo administrátora", 403);
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "ID školy je povinné", 400);

    const result = await listExpenses(schoolId, {
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      logger.error("expenses GET: returning error response", {
        request_id: requestId,
        route: ROUTE,
        error_code: err.code,
        status_code: err.statusCode,
        error_message: err.message,
      });
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    logger.error("expenses GET: unexpected error", {
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
