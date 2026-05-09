import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getOrCreateRequestId } from "@/lib/request-id";
import { createExpense, listExpenses } from "@/lib/db/expenses";
import { writeAuditEvent } from "@/lib/db/audit";
import { toErrorResponse, AppError } from "@/types/errors";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Expense creation requires committee or admin role", 403);
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

    if (!body.schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);
    if (!body.title?.trim()) throw new AppError("VALIDATION_ERROR", "title is required", 400);
    if (!body.category) throw new AppError("VALIDATION_ERROR", "category is required", 400);
    if (typeof body.amountCzk !== "number" || body.amountCzk <= 0) {
      throw new AppError("VALIDATION_ERROR", "amountCzk must be a positive number", 400);
    }
    if (!body.spentAt) throw new AppError("VALIDATION_ERROR", "spentAt is required", 400);

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

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));

  try {
    const actor = await getCurrentUser(requestId);

    if (!actor.roles.includes("committee") && !actor.roles.includes("admin")) {
      throw new AppError("FORBIDDEN", "Expense list requires committee or admin role", 403);
    }

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);

    const result = await listExpenses(schoolId, {
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toErrorResponse(err, requestId), { status: err.statusCode });
    }
    return NextResponse.json(
      toErrorResponse(new AppError("INTERNAL_ERROR", "Unexpected error", 500), requestId),
      { status: 500 },
    );
  }
}
