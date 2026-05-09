import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQueryRaw, mockTaskUpdate, mockStatusEventCreate, mockAuditLogCreate, mockTransaction } =
  vi.hoisted(() => ({
    mockQueryRaw: vi.fn(),
    mockTaskUpdate: vi.fn(),
    mockStatusEventCreate: vi.fn(),
    mockAuditLogCreate: vi.fn(),
    mockTransaction: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({
  db: {
    $transaction: mockTransaction,
    task: { findMany: vi.fn(), findUnique: vi.fn(), update: mockTaskUpdate },
    taskStatusEvent: { create: mockStatusEventCreate },
    auditLog: { create: mockAuditLogCreate },
  },
}));

import { claimTask } from "@/lib/db/tasks";
import { AppError, NotFoundError } from "@/types/errors";

const auditCtx = { tenantId: "t-1", schoolId: "s-1", requestId: "req-1" };

const openTask = {
  id: "task-1",
  schoolId: "s-1",
  classId: null,
  title: "Fix sink",
  description: "dripping",
  photoFileId: null,
  deadline: null,
  priority: "normal",
  status: "open",
  createdBy: "u-0",
  assignedTo: null,
  verifiedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const claimedTask = { ...openTask, status: "reserved", assignedTo: "u-1" };

beforeEach(() => vi.clearAllMocks());

describe("claimTask", () => {
  it("claims an open task successfully", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: mockQueryRaw.mockResolvedValueOnce([openTask]),
        task: { update: mockTaskUpdate.mockResolvedValueOnce(claimedTask) },
        taskStatusEvent: { create: mockStatusEventCreate.mockResolvedValueOnce({}) },
        auditLog: { create: mockAuditLogCreate.mockResolvedValueOnce({}) },
      };
      return fn(tx);
    });

    const result = await claimTask("task-1", "u-1", auditCtx);
    expect(result.status).toBe("reserved");
    expect(result.assignedTo).toBe("u-1");
  });

  it("throws NotFoundError when task does not exist", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = { $queryRaw: mockQueryRaw.mockResolvedValueOnce([]) };
      return fn(tx);
    });

    await expect(claimTask("missing", "u-1", auditCtx)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws TASK_ALREADY_CLAIMED when task is not open", async () => {
    const reservedTask = { ...openTask, status: "reserved", assignedTo: "u-other" };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = { $queryRaw: mockQueryRaw.mockResolvedValueOnce([reservedTask]) };
      return fn(tx);
    });

    const err = await claimTask("task-1", "u-1", auditCtx).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe("TASK_ALREADY_CLAIMED");
    expect((err as AppError).statusCode).toBe(409);
  });

  it("writes an audit event during claim", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: mockQueryRaw.mockResolvedValueOnce([openTask]),
        task: { update: mockTaskUpdate.mockResolvedValueOnce(claimedTask) },
        taskStatusEvent: { create: mockStatusEventCreate.mockResolvedValueOnce({}) },
        auditLog: { create: mockAuditLogCreate.mockResolvedValueOnce({}) },
      };
      return fn(tx);
    });

    await claimTask("task-1", "u-1", auditCtx);
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "task.claimed",
          entityType: "task",
          entityId: "task-1",
        }),
      }),
    );
  });
});
