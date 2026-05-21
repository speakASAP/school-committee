import type { Expense } from "@prisma/client";
import { db } from "@/lib/db/client";
import { NotFoundError } from "@/types/errors";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";

export interface CreateExpenseInput {
  schoolId: string;
  title: string;
  description?: string;
  category: string;
  amountCzk: number;
  spentAt: Date;
  receiptFileId?: string;
  publicVisible?: boolean;
  createdBy: string;
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  return db.expense.create({
    data: {
      schoolId: input.schoolId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      amountCzk: input.amountCzk,
      spentAt: input.spentAt,
      receiptFileId: input.receiptFileId ?? null,
      publicVisible: input.publicVisible ?? false,
      createdBy: input.createdBy,
    },
  });
}

export async function listExpenses(
  schoolId: string,
  params?: PageParams & { publicOnly?: boolean },
): Promise<PageResult<Expense>> {
  const limit = resolveLimit(params?.limit);
  const rows = await db.expense.findMany({
    where: {
      schoolId,
      ...(params?.publicOnly ? { publicVisible: true } : {}),
    },
    orderBy: { spentAt: "desc" },
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });
  return buildPage(rows, limit);
}

export async function getExpense(id: string): Promise<Expense> {
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) throw new NotFoundError("Výdaj nenalezen");
  return expense;
}
