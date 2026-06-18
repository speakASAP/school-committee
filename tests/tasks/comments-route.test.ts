import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockListTaskComments, mockCreateTaskComment, mockRequireApproved } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockListTaskComments: vi.fn(),
  mockCreateTaskComment: vi.fn(),
  mockRequireApproved: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: mockGetCurrentUser,
}));
vi.mock("@/lib/db/task-comments", () => ({
  listTaskComments: mockListTaskComments,
  createTaskComment: mockCreateTaskComment,
}));
vi.mock("@/lib/auth/require-approved", () => ({
  requireApproved: mockRequireApproved,
}));

import { GET, POST } from "@/app/api/tasks/[id]/comments/route";
import { UnauthenticatedError } from "@/types/errors";

const parentUser = {
  id: "u-parent",
  email: "p@test.com",
  roles: ["parent"],
  approvalStatus: "approved",
  rejectionReason: null,
};

const aComment = {
  id: "c-1",
  taskId: "t-1",
  userId: "u-parent",
  body: "Ahoj, budu tam!",
  createdAt: new Date("2026-06-18T10:00:00Z"),
  authorFirstName: "Jana",
  authorAvatarUrl: null,
};

const params = Promise.resolve({ id: "t-1" });

function makeGetRequest() {
  return new NextRequest("http://localhost/api/tasks/t-1/comments", { method: "GET" });
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/tasks/t-1/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(parentUser);
  mockListTaskComments.mockResolvedValue([aComment]);
  mockCreateTaskComment.mockResolvedValue(aComment);
  mockRequireApproved.mockReturnValue(undefined);
  process.env.DEFAULT_TENANT_ID = "tenant-1";
  process.env.DEFAULT_SCHOOL_ID = "school-1";
});

describe("GET /api/tasks/[id]/comments", () => {
  it("returns 200 with comment list", async () => {
    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: typeof aComment[] };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].body).toBe("Ahoj, budu tam!");
  });

  it("does not expose userId in response", async () => {
    const res = await GET(makeGetRequest(), { params });
    const body = (await res.json()) as { items: Record<string, unknown>[] };
    expect(body.items[0]).not.toHaveProperty("userId");
  });

  it("returns 200 with empty array when no comments", async () => {
    mockListTaskComments.mockResolvedValue([]);
    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(0);
  });
});

describe("POST /api/tasks/[id]/comments", () => {
  it("returns 201 with new comment for authenticated parent", async () => {
    const res = await POST(makePostRequest({ body: "Ahoj, budu tam!" }), { params });
    expect(res.status).toBe(201);
    const body = (await res.json()) as typeof aComment;
    expect(body.body).toBe("Ahoj, budu tam!");
  });

  it("returns 400 when body is empty string", async () => {
    const res = await POST(makePostRequest({ body: "" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body field is missing", async () => {
    const res = await POST(makePostRequest({}), { params });
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockRejectedValue(new UnauthenticatedError("Uživatel není přihlášen"));
    const res = await POST(makePostRequest({ body: "test" }), { params });
    expect(res.status).toBe(401);
  });

  it("does not expose userId in response", async () => {
    const res = await POST(makePostRequest({ body: "Test comment" }), { params });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("userId");
  });

  it("calls requireApproved to check user approval status", async () => {
    await POST(makePostRequest({ body: "Test" }), { params });
    expect(mockRequireApproved).toHaveBeenCalledWith(parentUser);
  });

  it("returns 400 when body is only whitespace", async () => {
    const res = await POST(makePostRequest({ body: "   " }), { params });
    expect(res.status).toBe(400);
  });
});
