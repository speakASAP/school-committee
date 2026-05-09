import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockClaimTask } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockClaimTask: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/db/tasks", () => ({
  claimTask: mockClaimTask,
  listTasks: vi.fn(),
  getTask: vi.fn(),
}));

import { POST } from "@/app/api/tasks/[id]/claim/route";
import { AppError } from "@/types/errors";

const parentUser = { id: "u-1", email: "parent@test.com", roles: ["parent"] };

const claimedTask = {
  id: "task-1",
  status: "reserved",
  assignedTo: "u-1",
};

function makeRequest(body: unknown, id = "task-1") {
  const req = new NextRequest(`http://localhost/api/tasks/${id}/claim`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return { req, params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(parentUser);
});

describe("POST /api/tasks/[id]/claim", () => {
  it("returns 200 with updated task on successful claim", async () => {
    mockClaimTask.mockResolvedValue(claimedTask);
    const { req, params } = makeRequest({ tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.task.status).toBe("reserved");
    expect(body.task.isClaimed).toBe(true);
  });

  it("returns 409 when task is already claimed (TASK_ALREADY_CLAIMED)", async () => {
    mockClaimTask.mockRejectedValue(new AppError("TASK_ALREADY_CLAIMED", "Task is no longer open", 409));
    const { req, params } = makeRequest({ tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("TASK_ALREADY_CLAIMED");
  });

  it("returns 401 when unauthenticated", async () => {
    const { UnauthenticatedError } = await import("@/types/errors");
    mockGetCurrentUser.mockRejectedValue(new UnauthenticatedError());
    const { req, params } = makeRequest({ tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 when tenantId is missing", async () => {
    const { req, params } = makeRequest({ schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });
});

describe("task claim role access", () => {
  it("returns 403 when user has no eligible role", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u-2", email: "x@test.com", roles: ["teacher"] });
    const { req, params } = makeRequest({ tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(403);
  });
});
