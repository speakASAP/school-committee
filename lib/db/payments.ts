import type { PaymentIntent } from "@prisma/client";
import { db } from "@/lib/db/client";
import { NotFoundError } from "@/types/errors";
import { buildPage, resolveLimit, type PageParams, type PageResult } from "@/lib/db/pagination";

export interface PaymentYearStatus {
  paid: boolean;
  paidAt?: string;
  amountCzk?: number;
  paidByFamily?: boolean;
}

// Returns payment status for the current school year + semester.
// Checks both the user's own intents and any family member's paid intents.
export async function getPaymentStatusForYear(
  userId: string,
  schoolYear: string,
  semester?: string,
): Promise<PaymentYearStatus> {
  // 1. Direct user payment
  const ownIntent = await db.paymentIntent.findFirst({
    where: {
      userId,
      status: { in: ["paid", "reconciled", "manually_corrected"] },
      ...(semester
        ? { schoolYear, semester }
        : { message: { contains: schoolYear } }),
    },
    orderBy: { paidAt: "desc" },
    select: { paidAt: true, amountCzk: true },
  });

  if (ownIntent) {
    return { paid: true, paidAt: ownIntent.paidAt?.toISOString(), amountCzk: ownIntent.amountCzk };
  }

  // 2. Family payment — find the user's family membership, then check family intents
  const membership = await db.familyMember.findFirst({
    where: { userId },
    select: { familyId: true },
  });

  if (membership) {
    const familyIntent = await db.paymentIntent.findFirst({
      where: {
        familyId: membership.familyId,
        status: { in: ["paid", "reconciled", "manually_corrected"] },
        ...(semester
          ? { schoolYear, semester }
          : { message: { contains: schoolYear } }),
      },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true, amountCzk: true },
    });

    if (familyIntent) {
      return {
        paid: true,
        paidByFamily: true,
        paidAt: familyIntent.paidAt?.toISOString(),
        amountCzk: familyIntent.amountCzk,
      };
    }
  }

  return { paid: false };
}

// Resolves or creates a Family for a user based on their registered children.
// If another parent already has a child with the same firstName+lastName+classId,
// they share a family. Returns the familyId.
export async function resolveOrCreateFamily(
  userId: string,
  schoolId: string,
): Promise<string> {
  const myChildren = await db.child.findMany({
    where: { parentUserId: userId, schoolId },
    select: { firstName: true, lastName: true, classId: true, familyId: true },
  });

  // If already in a family (first child has familyId), reuse it
  const existingFamilyId = myChildren.find((c) => c.familyId)?.familyId;
  if (existingFamilyId) return existingFamilyId;

  // Check if any sibling child registered by another parent shares names+class
  for (const child of myChildren) {
    const sibling = await db.child.findFirst({
      where: {
        firstName: child.firstName,
        lastName: child.lastName,
        classId: child.classId,
        schoolId,
        familyId: { not: null },
        parentUserId: { not: userId },
      },
      select: { familyId: true },
    });

    if (sibling?.familyId) {
      // Join existing family — link all my children and add me as member
      await db.$transaction([
        db.child.updateMany({
          where: { parentUserId: userId, schoolId },
          data: { familyId: sibling.familyId },
        }),
        db.familyMember.upsert({
          where: { familyId_userId: { familyId: sibling.familyId, userId } },
          create: { familyId: sibling.familyId, userId, role: "parent" },
          update: {},
        }),
      ]);
      return sibling.familyId;
    }
  }

  // No match — create a new family
  const family = await db.$transaction(async (tx) => {
    const f = await tx.family.create({ data: { schoolId } });
    await tx.familyMember.create({ data: { familyId: f.id, userId, role: "parent" } });
    if (myChildren.length > 0) {
      await tx.child.updateMany({
        where: { parentUserId: userId, schoolId },
        data: { familyId: f.id },
      });
    }
    return f;
  });

  return family.id;
}

export interface CreatePaymentIntentInput {
  schoolId: string;
  userId: string;
  familyId?: string;
  planId?: string;
  amountCzk: number;
  variableSymbol: string;
  message?: string;
  schoolYear?: string;
  semester?: string;
  expiresAt?: Date;
}

export async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<PaymentIntent> {
  return db.paymentIntent.create({
    data: {
      schoolId: input.schoolId,
      userId: input.userId,
      familyId: input.familyId ?? null,
      planId: input.planId ?? null,
      amountCzk: input.amountCzk,
      variableSymbol: input.variableSymbol,
      message: input.message ?? null,
      schoolYear: input.schoolYear ?? null,
      semester: input.semester ?? null,
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
