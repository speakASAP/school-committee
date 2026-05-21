import type { PaymentIntent } from "@prisma/client";
import { db } from "@/lib/db/client";
import { NotFoundError } from "@/types/errors";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";

export interface CreatePaymentIntentInput {
  schoolId: string;
  userId: string;
  planId?: string;
  amountCzk: number;
  variableSymbol: string;
  message?: string;
  expiresAt?: Date;
}

export async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<PaymentIntent> {
  return db.paymentIntent.create({
    data: {
      schoolId: input.schoolId,
      userId: input.userId,
      planId: input.planId ?? null,
      amountCzk: input.amountCzk,
      variableSymbol: input.variableSymbol,
      message: input.message ?? null,
      status: "pending",
      expiresAt: input.expiresAt ?? null,
    },
  });
}

export async function getPaymentIntent(id: string): Promise<PaymentIntent> {
  const pi = await db.paymentIntent.findUnique({ where: { id } });
  if (!pi) throw new NotFoundError("Platební záměr nenalezen");
  return pi;
}

export async function listPaymentIntents(
  schoolId: string,
  userId: string,
  params?: PageParams,
): Promise<PageResult<PaymentIntent>> {
  const limit = resolveLimit(params?.limit);
  const rows = await db.paymentIntent.findMany({
    where: { schoolId, userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });
  return buildPage(rows, limit);
}
