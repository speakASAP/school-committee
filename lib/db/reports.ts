import { db } from "@/lib/db/client";

export interface PublicReport {
  schoolId: string;
  totalCollectedCzk: number;
  totalExpensesCzk: number;
  balanceCzk: number;
  paymentCount: number;
  expenseCount: number;
}

export async function getPublicReport(schoolId: string): Promise<PublicReport> {
  const [paymentsAgg, expensesAgg] = await Promise.all([
    db.paymentIntent.aggregate({
      where: { schoolId, status: "paid" },
      _sum: { amountCzk: true },
      _count: { id: true },
    }),
    db.expense.aggregate({
      where: { schoolId, publicVisible: true },
      _sum: { amountCzk: true },
      _count: { id: true },
    }),
  ]);

  const totalCollectedCzk = paymentsAgg._sum.amountCzk ?? 0;
  const totalExpensesCzk = expensesAgg._sum.amountCzk ?? 0;

  return {
    schoolId,
    totalCollectedCzk,
    totalExpensesCzk,
    balanceCzk: totalCollectedCzk - totalExpensesCzk,
    paymentCount: paymentsAgg._count.id,
    expenseCount: expensesAgg._count.id,
  };
}
