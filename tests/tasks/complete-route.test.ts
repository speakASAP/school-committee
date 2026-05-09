import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetCurrentUser,
  mockGetTask,
  mockTaskUpdate,
  mockStatusEventCreate,
  mockAuditLogCreate,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockGetTask: vi.fn(),
  mockTaskUpdate: vi.fn(),
  mockStatusEventCreate: vi.fn(),
  mockAuditLogCreate: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/db/tasks", () => ({ getTask: mockGetTask, listTasks: vi.fn(), claimTask: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  db: {
    task: { update: mockTaskUpdate },
    taskStatusEvent: { create: mockStatusEventCreate },
    auditLog: { create: mockAuditLogCreate },
  },
}));
vi.mock("@/lib/db/audit", () => ({ writeAuditEvent: mockAuditLogCreate }));

import { POST } from "@/app/api/tasks/[id]/complete/route";

const assignee = { id: "u-1", email: "parent@test.com", roles: ["parent"] };
const committeeUser = { id: "u-2", email: "committee@test.com", roles: ["committee"] };

const reservedTask = {
  id: "task-1",
  status: "reserved",
  assignedTo: "u-1",
  schoolId: "s-1",
};

function makeRequest(body: unknown, userId = "u-1", id = "task-1") {
  const req = new NextRequest(`http://localhost/api/tasks/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return { req, params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(assignee);
  mockGetTask.mockResolvedValue(reservedTask);
  mockTaskUpdate.mockResolvedValue({ ...reservedTask, status: "completed" });
  mockStatusEventCreate.mockResolvedValue({});
  mockAuditLogCreate.mockResolvedValue({});
});

describe("POST /api/tasks/[id]/complete", () => {
  it("returns 200 when assignee submits completion", async () => {
    const { req, params } = makeRequest({ tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task.status).toBe("completed");
  });

  it("returns 403 when non-assignee tries to complete", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...assignee, id: "u-other" });
    const { req, params } = makeRequest({ tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(403);
  });

  it("parent cannot access verify endpoint (verify is committee only)", async () => {
    // Parents submit completion; committee verifies via a separate endpoint (not in scope here)
    // Verify that the complete endpoint is assignee-only (not open to any parent)
    mockGetCurrentUser.mockResolvedValue({ ...assignee, id: "u-other-parent" });
    const { req, params } = makeRequest({ tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(403);
  });
});
