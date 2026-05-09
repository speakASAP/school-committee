import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { toErrorResponse, AppError } from "@/types/errors";
import { getOrCreateRequestId } from "@/lib/request-id";

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) throw new AppError("VALIDATION_ERROR", "schoolId is required", 400);

    const [collectedAgg, spentAgg, expenses, completedTaskCount] = await Promise.all([
      db.paymentIntent.aggregate({
        where: { schoolId, status: "paid" },
        _sum: { amountCzk: true },
      }),
      db.expense.aggregate({
        where: { schoolId },
        _sum: { amountCzk: true },
      }),
      db.expense.findMany({
        where: { schoolId, publicVisible: true },
        select: { id: true, title: true, category: true, amountCzk: true, spentAt: true },
        orderBy: { spentAt: "desc" },
        take: 50,
      }),
      db.task.count({ where: { schoolId, status: "completed" } }),
    ]);

    const totalCollectedCzk = collectedAgg._sum.amountCzk ?? 0;
    const totalSpentCzk = spentAgg._sum.amountCzk ?? 0;

    return NextResponse.json({
      totalCollectedCzk,
      totalSpentCzk,
      balanceCzk: totalCollectedCzk - totalSpentCzk,
      completedTaskCount,
      expenses,
    });
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
