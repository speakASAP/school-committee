import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@/lib/db/client", () => ({
  db: { auditLog: { create: mockCreate } },
}));

import { writeAuditEvent } from "@/lib/db/audit";

const baseEvent = {
  tenantId: "t-1",
  schoolId: "s-1",
  actorUserId: "u-1",
  action: "expense.created",
  entityType: "expense",
  entityId: "e-1",
  requestId: "req-1",
};

beforeEach(() => vi.clearAllMocks());

describe("writeAuditEvent", () => {
  it("persists all fields to audit_logs via db", async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditEvent(baseEvent);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t-1",
          schoolId: "s-1",
          actorUserId: "u-1",
          action: "expense.created",
          entityType: "expense",
          entityId: "e-1",
          requestId: "req-1",
        }),
      }),
    );
  });

  it("defaults metadata to empty object when not provided", async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditEvent({ tenantId: "t-1", action: "x", entityType: "y" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metadata: {} }),
      }),
    );
  });

  it("uses provided transaction client instead of global db", async () => {
    const txCreate = vi.fn().mockResolvedValue({});
    const tx = { auditLog: { create: txCreate } } as unknown as Parameters<
      typeof writeAuditEvent
    >[1];

    await writeAuditEvent(baseEvent, tx);
    expect(txCreate).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("nulls out optional fields when absent", async () => {
    mockCreate.mockResolvedValue({});
    await writeAuditEvent({ tenantId: "t-1", action: "x", entityType: "y" });
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.schoolId).toBeNull();
    expect(call.data.actorUserId).toBeNull();
    expect(call.data.entityId).toBeNull();
    expect(call.data.requestId).toBeNull();
    expect(call.data.ipHash).toBeNull();
  });
});
