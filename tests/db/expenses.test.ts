import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindMany, mockFindUnique } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    expense: {
      create: mockCreate,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
    },
  },
}));

import { createExpense, listExpenses, getExpense } from "@/lib/db/expenses";
import { NotFoundError } from "@/types/errors";

const baseExpense = {
  id: "exp-1",
  schoolId: "s-1",
  title: "Printer paper",
  description: null,
  category: "supplies",
  amountCzk: 500,
  spentAt: new Date("2026-01-15"),
  receiptFileId: null,
  publicVisible: false,
  createdBy: "u-1",
  approvedBy: null,
  createdAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("createExpense", () => {
  it("creates expense with required fields", async () => {
    mockCreate.mockResolvedValue(baseExpense);
    const result = await createExpense({
      schoolId: "s-1",
      title: "Printer paper",
      category: "supplies",
      amountCzk: 500,
      spentAt: new Date("2026-01-15"),
      createdBy: "u-1",
    });
    expect(result.id).toBe("exp-1");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: "s-1",
          amountCzk: 500,
          publicVisible: false,
        }),
      }),
    );
  });

  it("defaults publicVisible to false", async () => {
    mockCreate.mockResolvedValue(baseExpense);
    await createExpense({
      schoolId: "s-1",
      title: "x",
      category: "misc",
      amountCzk: 100,
      spentAt: new Date(),
      createdBy: "u-1",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publicVisible: false }),
      }),
    );
  });
});

describe("listExpenses", () => {
  it("returns paginated list", async () => {
    mockFindMany.mockResolvedValue([baseExpense]);
    const result = await listExpenses("s-1");
    expect(result.items).toHaveLength(1);
  });

  it("filters to public-only when publicOnly is true", async () => {
    mockFindMany.mockResolvedValue([]);
    await listExpenses("s-1", { publicOnly: true });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ publicVisible: true }),
      }),
    );
  });

  it("does not filter visibility when publicOnly is false", async () => {
    mockFindMany.mockResolvedValue([]);
    await listExpenses("s-1", { publicOnly: false });
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("publicVisible");
  });
});

describe("getExpense", () => {
  it("returns the expense when found", async () => {
    mockFindUnique.mockResolvedValue(baseExpense);
    const result = await getExpense("exp-1");
    expect(result.id).toBe("exp-1");
  });

  it("throws NotFoundError when not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(getExpense("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
