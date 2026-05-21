import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockFindUnique,
  mockUpdate,
  mockUpdateMany,
  mockUserRoleCreate,
  mockReconciliationCreate,
  mockCount,
  mockFindMany,
  mockCreateExpense,
  mockListExpenses,
  mockWriteAuditEvent,
  mockListUsers,
  mockSetUserActive,
  mockDeleteUserFromApp,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockUserRoleCreate: vi.fn(),
  mockReconciliationCreate: vi.fn(),
  mockCount: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreateExpense: vi.fn(),
  mockListExpenses: vi.fn(),
  mockWriteAuditEvent: vi.fn(),
  mockListUsers: vi.fn(),
  mockSetUserActive: vi.fn(),
  mockDeleteUserFromApp: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: mockGetCurrentUser,
}));
vi.mock("@/lib/db/client", () => ({
  db: {
    userRole: {
      create: mockUserRoleCreate,
      updateMany: mockUpdateMany,
      count: mockCount,
    },
    paymentIntent: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      findMany: mockFindMany,
    },
    paymentReconciliationEvent: {
      create: mockReconciliationCreate,
    },
    task: { findMany: mockFindMany },
    feedbackItem: { findMany: mockFindMany },
  },
}));
vi.mock("@/lib/db/expenses", () => ({
  createExpense: mockCreateExpense,
  listExpenses: mockListExpenses,
}));
vi.mock("@/lib/db/audit", () => ({ writeAuditEvent: mockWriteAuditEvent }));
vi.mock("@/lib/db/users", () => ({
  listUsers: mockListUsers,
  setUserActive: mockSetUserActive,
  deleteUserFromApp: mockDeleteUserFromApp,
}));

import { PATCH as patchRole } from "@/app/api/admin/users/[id]/role/route";
import { POST as confirmPayment } from "@/app/api/admin/payments/[id]/confirm/route";
import { POST as createExpense, GET as getExpenses } from "@/app/api/admin/expenses/route";
import { GET as exportCsv } from "@/app/api/admin/exports/[type]/route";
import { GET as listUsersRoute } from "@/app/api/admin/users/route";
import { PATCH as patchUser, DELETE as deleteUser } from "@/app/api/admin/users/[id]/route";

const parentUser = { id: "u-parent", email: "parent@test.com", roles: ["parent"] };
const committeeUser = { id: "u-committee", email: "committee@test.com", roles: ["committee"] };
const adminUser = { id: "u-admin", email: "admin@test.com", roles: ["admin"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(adminUser);
  mockWriteAuditEvent.mockResolvedValue(undefined);
});

// ── Role Assignment ──────────────────────────────────────────────────────────

describe("PATCH /api/admin/users/[id]/role — role assignment", () => {
  it("returns 403 for parent (admin-only endpoint)", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/admin/users/u-2/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "committee", tenantId: "t-1", action: "assign" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchRole(req, { params: Promise.resolve({ id: "u-2" }) });
    expect(res.status).toBe(403);
  });

  it("returns 403 for committee (admin-only endpoint)", async () => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    const req = new NextRequest("http://localhost/api/admin/users/u-2/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "committee", tenantId: "t-1", action: "assign" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchRole(req, { params: Promise.resolve({ id: "u-2" }) });
    expect(res.status).toBe(403);
  });

  it("admin can assign a role and audit event is written", async () => {
    mockUserRoleCreate.mockResolvedValue({});
    const req = new NextRequest("http://localhost/api/admin/users/u-2/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "committee", tenantId: "t-1", action: "assign" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchRole(req, { params: Promise.resolve({ id: "u-2" }) });
    expect(res.status).toBe(200);
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "role.assigned" }),
    );
  });

  it("blocks last-admin removal", async () => {
    mockCount.mockResolvedValue(1);
    const req = new NextRequest("http://localhost/api/admin/users/u-admin/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "admin", tenantId: "t-1", action: "revoke" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchRole(req, { params: Promise.resolve({ id: "u-admin" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/last admin/i);
  });

  it("allows revoking admin when multiple admins exist", async () => {
    mockCount.mockResolvedValue(2);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    const req = new NextRequest("http://localhost/api/admin/users/u-2/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "admin", tenantId: "t-1", action: "revoke" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchRole(req, { params: Promise.resolve({ id: "u-2" }) });
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid role", async () => {
    const req = new NextRequest("http://localhost/api/admin/users/u-2/role", {
      method: "PATCH",
      body: JSON.stringify({ role: "superuser", tenantId: "t-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchRole(req, { params: Promise.resolve({ id: "u-2" }) });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────

describe("GET /api/admin/users — list users", () => {
  const profile1: import("@/lib/db/users").UserRow = {
    userId: "u-1",
    tenantId: "t-1",
    schoolId: "s-1",
    email: "jana@example.com",
    titleBefore: null,
    titleAfter: null,
    firstName: "Jana",
    lastName: "Novák",
    bio: null,
    phone: null,
    language: "cs",
    participationType: "financial",
    onboardingStatus: "complete",
    approvalStatus: "approved",
    rejectionReason: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    roles: ["parent"],
  };

  beforeEach(() => {
    mockListUsers.mockResolvedValue([profile1]);
  });

  it("returns 403 for non-admin", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/admin/users?tenantId=t-1");
    const res = await listUsersRoute(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when tenantId missing", async () => {
    const req = new NextRequest("http://localhost/api/admin/users");
    const res = await listUsersRoute(req);
    expect(res.status).toBe(400);
  });

  it("returns user list for admin", async () => {
    const req = new NextRequest("http://localhost/api/admin/users?tenantId=t-1");
    const res = await listUsersRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0].userId).toBe("u-1");
    expect(body.users[0].firstName).toBe("Jana");
    expect(body.users[0].roles).toEqual(["parent"]);
    expect(mockListUsers).toHaveBeenCalledWith("t-1", undefined);
  });

  it("passes schoolId filter when provided", async () => {
    const req = new NextRequest("http://localhost/api/admin/users?tenantId=t-1&schoolId=s-1");
    await listUsersRoute(req);
    expect(mockListUsers).toHaveBeenCalledWith("t-1", "s-1");
  });
});

// ── PATCH /api/admin/users/[id] — deactivate/reactivate ─────────────────────

describe("PATCH /api/admin/users/[id] — activate/deactivate", () => {
  beforeEach(() => {
    mockSetUserActive.mockResolvedValue(undefined);
  });

  it("returns 403 for non-admin", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/admin/users/u-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "deactivate", tenantId: "t-1" }),
    });
    const res = await patchUser(req, { params: Promise.resolve({ id: "u-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing action", async () => {
    const req = new NextRequest("http://localhost/api/admin/users/u-1", {
      method: "PATCH",
      body: JSON.stringify({ tenantId: "t-1" }),
    });
    const res = await patchUser(req, { params: Promise.resolve({ id: "u-1" }) });
    expect(res.status).toBe(400);
  });

  it("deactivates user and writes audit", async () => {
    const req = new NextRequest("http://localhost/api/admin/users/u-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "deactivate", tenantId: "t-1" }),
    });
    const res = await patchUser(req, { params: Promise.resolve({ id: "u-1" }) });
    expect(res.status).toBe(200);
    expect(mockSetUserActive).toHaveBeenCalledWith("u-1", "t-1", false);
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.deactivated", entityId: "u-1" }),
    );
  });

  it("reactivates user and writes audit", async () => {
    const req = new NextRequest("http://localhost/api/admin/users/u-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "activate", tenantId: "t-1" }),
    });
    const res = await patchUser(req, { params: Promise.resolve({ id: "u-1" }) });
    expect(res.status).toBe(200);
    expect(mockSetUserActive).toHaveBeenCalledWith("u-1", "t-1", true);
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.activated", entityId: "u-1" }),
    );
  });
});

// ── DELETE /api/admin/users/[id] — remove from app ──────────────────────────

describe("DELETE /api/admin/users/[id] — remove from school-committee", () => {
  beforeEach(() => {
    mockDeleteUserFromApp.mockResolvedValue(undefined);
  });

  it("returns 403 for non-admin", async () => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    const req = new NextRequest("http://localhost/api/admin/users/u-1", {
      method: "DELETE",
      body: JSON.stringify({ tenantId: "t-1" }),
    });
    const res = await deleteUser(req, { params: Promise.resolve({ id: "u-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing tenantId", async () => {
    const req = new NextRequest("http://localhost/api/admin/users/u-1", {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    const res = await deleteUser(req, { params: Promise.resolve({ id: "u-1" }) });
    expect(res.status).toBe(400);
  });

  it("deletes profile + revokes roles and writes audit", async () => {
    const req = new NextRequest("http://localhost/api/admin/users/u-1", {
      method: "DELETE",
      body: JSON.stringify({ tenantId: "t-1", schoolId: "s-1" }),
    });
    const res = await deleteUser(req, { params: Promise.resolve({ id: "u-1" }) });
    expect(res.status).toBe(200);
    expect(mockDeleteUserFromApp).toHaveBeenCalledWith("u-1", "t-1");
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.removed_from_app",
        entityId: "u-1",
        tenantId: "t-1",
        schoolId: "s-1",
      }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ── Payment Confirmation ─────────────────────────────────────────────────────

describe("POST /api/admin/payments/[id]/confirm — payment confirmation", () => {
  const pendingPayment = {
    id: "pi-1",
    schoolId: "s-1",
    userId: "u-parent",
    amountCzk: 500,
    variableSymbol: "2605000001",
    status: "pending",
    paidAt: null,
  };

  beforeEach(() => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    mockFindUnique.mockResolvedValue(pendingPayment);
    mockUpdate.mockResolvedValue({ ...pendingPayment, status: "paid" });
    mockReconciliationCreate.mockResolvedValue({});
  });

  it("marks payment as paid and writes audit event", async () => {
    const req = new NextRequest("http://localhost/api/admin/payments/pi-1/confirm", {
      method: "POST",
      body: JSON.stringify({ reference: "2605000001/0800", tenantId: "t-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await confirmPayment(req, { params: Promise.resolve({ id: "pi-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paid");
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payment.confirmed" }),
    );
  });

  it("returns 409 when payment is already paid (immutability)", async () => {
    mockFindUnique.mockResolvedValue({ ...pendingPayment, status: "paid" });
    const req = new NextRequest("http://localhost/api/admin/payments/pi-1/confirm", {
      method: "POST",
      body: JSON.stringify({ reference: "2605000001/0800", tenantId: "t-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await confirmPayment(req, { params: Promise.resolve({ id: "pi-1" }) });
    expect(res.status).toBe(409);
  });

  it("returns 403 for parent", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/admin/payments/pi-1/confirm", {
      method: "POST",
      body: JSON.stringify({ reference: "ref", tenantId: "t-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await confirmPayment(req, { params: Promise.resolve({ id: "pi-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when reference is missing", async () => {
    const req = new NextRequest("http://localhost/api/admin/payments/pi-1/confirm", {
      method: "POST",
      body: JSON.stringify({ tenantId: "t-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await confirmPayment(req, { params: Promise.resolve({ id: "pi-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when payment not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/payments/pi-999/confirm", {
      method: "POST",
      body: JSON.stringify({ reference: "ref", tenantId: "t-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await confirmPayment(req, { params: Promise.resolve({ id: "pi-999" }) });
    expect(res.status).toBe(404);
  });
});

// ── Expense Management ───────────────────────────────────────────────────────

describe("POST /api/admin/expenses — expense creation", () => {
  const newExpense = {
    id: "exp-1",
    schoolId: "s-1",
    title: "Whiteboard markers",
    description: null,
    category: "supplies",
    amountCzk: 250,
    spentAt: new Date(),
    publicVisible: true,
    createdBy: "u-committee",
  };

  beforeEach(() => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    mockCreateExpense.mockResolvedValue(newExpense);
  });

  it("creates expense and writes audit event", async () => {
    const req = new NextRequest("http://localhost/api/admin/expenses", {
      method: "POST",
      body: JSON.stringify({
        schoolId: "s-1",
        title: "Whiteboard markers",
        category: "supplies",
        amountCzk: 250,
        spentAt: "2026-05-01",
        tenantId: "t-1",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await createExpense(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.expense.id).toBe("exp-1");
    expect(mockCreateExpense).toHaveBeenCalled();
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "expense.created" }),
    );
  });

  it("returns 403 for parent", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/admin/expenses", {
      method: "POST",
      body: JSON.stringify({ schoolId: "s-1", title: "X", category: "supplies", amountCzk: 100, spentAt: "2026-05-01" }),
      headers: { "content-type": "application/json" },
    });
    const res = await createExpense(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when amountCzk is zero or negative", async () => {
    const req = new NextRequest("http://localhost/api/admin/expenses", {
      method: "POST",
      body: JSON.stringify({ schoolId: "s-1", title: "X", category: "supplies", amountCzk: 0, spentAt: "2026-05-01" }),
      headers: { "content-type": "application/json" },
    });
    const res = await createExpense(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is missing", async () => {
    const req = new NextRequest("http://localhost/api/admin/expenses", {
      method: "POST",
      body: JSON.stringify({ schoolId: "s-1", category: "supplies", amountCzk: 100, spentAt: "2026-05-01" }),
      headers: { "content-type": "application/json" },
    });
    const res = await createExpense(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/expenses", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    mockListExpenses.mockResolvedValue({ items: [], nextCursor: null });
  });

  it("returns expense list for committee", async () => {
    const req = new NextRequest("http://localhost/api/admin/expenses?schoolId=s-1");
    const res = await getExpenses(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 when schoolId missing", async () => {
    const req = new NextRequest("http://localhost/api/admin/expenses");
    const res = await getExpenses(req);
    expect(res.status).toBe(400);
  });
});

// ── CSV Export ───────────────────────────────────────────────────────────────

describe("GET /api/admin/exports/[type] — CSV export", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockFindMany.mockResolvedValue([]);
  });

  it("returns CSV for payments export with audit event", async () => {
    const req = new NextRequest("http://localhost/api/admin/exports/payments?schoolId=s-1&tenantId=t-1");
    const res = await exportCsv(req, { params: Promise.resolve({ type: "payments" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "export.generated",
        metadata: expect.objectContaining({ exportType: "payments" }),
      }),
    );
  });

  it("audit event includes record_count", async () => {
    mockFindMany.mockResolvedValue([{ id: "t-1", title: "A", status: "open", priority: "normal", deadline: null, createdAt: new Date() }]);
    const req = new NextRequest("http://localhost/api/admin/exports/tasks?schoolId=s-1&tenantId=t-1");
    await exportCsv(req, { params: Promise.resolve({ type: "tasks" }) });
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ recordCount: 1 }),
      }),
    );
  });

  it("returns 403 for committee (admin-only export)", async () => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    const req = new NextRequest("http://localhost/api/admin/exports/payments?schoolId=s-1&tenantId=t-1");
    const res = await exportCsv(req, { params: Promise.resolve({ type: "payments" }) });
    expect(res.status).toBe(403);
  });

  it("returns 403 for parent", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/admin/exports/payments?schoolId=s-1&tenantId=t-1");
    const res = await exportCsv(req, { params: Promise.resolve({ type: "payments" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 for unknown export type", async () => {
    const req = new NextRequest("http://localhost/api/admin/exports/invoices?schoolId=s-1&tenantId=t-1");
    const res = await exportCsv(req, { params: Promise.resolve({ type: "invoices" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when schoolId is missing", async () => {
    const req = new NextRequest("http://localhost/api/admin/exports/payments?tenantId=t-1");
    const res = await exportCsv(req, { params: Promise.resolve({ type: "payments" }) });
    expect(res.status).toBe(400);
  });

  it("feedback export scrubs userId for anonymous items", async () => {
    mockFindMany.mockResolvedValue([
      { id: "fi-1", category: "general", type: "suggestion", text: "x", status: "new", isAnonymous: true, createdAt: new Date(), userId: "u-secret" },
    ]);
    const req = new NextRequest("http://localhost/api/admin/exports/feedback?schoolId=s-1&tenantId=t-1");
    const res = await exportCsv(req, { params: Promise.resolve({ type: "feedback" }) });
    const csv = await res.text();
    expect(csv).not.toContain("u-secret");
  });
});
