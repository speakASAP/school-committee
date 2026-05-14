import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockPublishTask } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockPublishTask: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/db/task-media", () => ({ publishTask: mockPublishTask }));

import { POST } from "@/app/api/tasks/[id]/publish/route";
import { AppError } from "@/types/errors";

const teacherUser = { id: "u-1", email: "teacher@test.com", roles: ["teacher"] };
const parentUser = { id: "u-2", email: "parent@test.com", roles: ["parent"] };

function makeRequest(body: unknown, id = "task-1") {
  const req = new NextRequest(`http://localhost/api/tasks/${id}/publish`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return { req, params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(teacherUser);
});

describe("POST /api/tasks/[id]/publish", () => {
  it("returns 403 for parent role", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const { req, params } = makeRequest({ title: "T", description: "D", tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    const { req, params } = makeRequest({ description: "D", tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is missing", async () => {
    const { req, params } = makeRequest({ title: "T", tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  it("returns 409 when task is not a draft", async () => {
    mockPublishTask.mockRejectedValue(new AppError("CONFLICT", "Task is not a draft", 409));
    const { req, params } = makeRequest({ title: "T", description: "D", tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(409);
  });

  it("returns 403 when teacher tries to publish another teacher's draft", async () => {
    mockPublishTask.mockRejectedValue(new AppError("FORBIDDEN", "Not your draft", 403));
    const { req, params } = makeRequest({ title: "T", description: "D", tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(403);
  });

  it("returns 200 with published task on success", async () => {
    mockPublishTask.mockResolvedValue({ id: "task-1", status: "open", title: "T" });
    const { req, params } = makeRequest({ title: "T", description: "D", tenantId: "t-1", schoolId: "s-1" });
    const res = await POST(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("open");
  });
});
