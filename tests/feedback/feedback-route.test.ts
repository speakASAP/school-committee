import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockTryGetCurrentUser,
  mockGetCurrentUser,
  mockCreateFeedback,
  mockListFeedback,
  mockModerateFeedback,
  mockFindUnique,
  mockWriteAuditEvent,
} = vi.hoisted(() => ({
  mockTryGetCurrentUser: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockCreateFeedback: vi.fn(),
  mockListFeedback: vi.fn(),
  mockModerateFeedback: vi.fn(),
  mockFindUnique: vi.fn(),
  mockWriteAuditEvent: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: mockGetCurrentUser,
  tryGetCurrentUser: mockTryGetCurrentUser,
}));
vi.mock("@/lib/db/feedback", () => ({
  createFeedback: mockCreateFeedback,
  listFeedback: mockListFeedback,
  moderateFeedback: mockModerateFeedback,
}));
vi.mock("@/lib/db/client", () => ({
  db: { feedbackItem: { findUnique: mockFindUnique } },
}));
vi.mock("@/lib/db/audit", () => ({ writeAuditEvent: mockWriteAuditEvent }));

import { POST, GET } from "@/app/api/feedback/route";
import { GET as getFeedbackById, PATCH as patchFeedback } from "@/app/api/feedback/[id]/route";

const parentUser = { id: "u-1", email: "parent@test.com", roles: ["parent"] };
const committeeUser = { id: "u-2", email: "committee@test.com", roles: ["committee"] };

const baseFeedback = {
  id: "fi-1",
  schoolId: "s-1",
  classId: null,
  userId: "u-1",
  isAnonymous: false,
  category: "general",
  type: "suggestion",
  text: "Needs more parking",
  status: "new",
  moderatedBy: null,
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function makeGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/feedback");
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTryGetCurrentUser.mockResolvedValue(parentUser);
  mockGetCurrentUser.mockResolvedValue(parentUser);
  mockCreateFeedback.mockResolvedValue(baseFeedback);
  mockWriteAuditEvent.mockResolvedValue(undefined);
});

const validSubmission = {
  schoolId: "s-1",
  isAnonymous: false,
  category: "general",
  type: "suggestion",
  text: "More parking please",
};

describe("POST /api/feedback (public)", () => {
  it("returns 200 for authenticated user", async () => {
    const res = await POST(makePostRequest(validSubmission));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("fi-1");
  });

  it("returns 200 for anonymous submission without login", async () => {
    mockTryGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makePostRequest({ ...validSubmission, isAnonymous: true }));
    expect(res.status).toBe(200);
  });

  it("anonymous submission does not store userId", async () => {
    mockTryGetCurrentUser.mockResolvedValue(parentUser);
    await POST(makePostRequest({ ...validSubmission, isAnonymous: true }));
    expect(mockCreateFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined, isAnonymous: true }),
    );
  });

  it("audit event omits actorUserId for anonymous submission", async () => {
    mockTryGetCurrentUser.mockResolvedValue(null);
    await POST(makePostRequest({ ...validSubmission, isAnonymous: true }));
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: undefined }),
    );
  });

  it("returns 401 for named submission without auth", async () => {
    mockTryGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makePostRequest({ ...validSubmission, isAnonymous: false }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when category is invalid", async () => {
    const res = await POST(makePostRequest({ ...validSubmission, category: "invalid_cat" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    const res = await POST(makePostRequest({ ...validSubmission, type: "invalid_type" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is empty", async () => {
    const res = await POST(makePostRequest({ ...validSubmission, text: "  " }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/feedback (auth required)", () => {
  it("returns 401 when not authenticated", async () => {
    mockTryGetCurrentUser.mockResolvedValue(null);
    const res = await GET(makeGetRequest({ schoolId: "s-1" }));
    expect(res.status).toBe(401);
  });

  it("returns items for authenticated user", async () => {
    mockListFeedback.mockResolvedValue({ items: [baseFeedback], nextCursor: null });
    const res = await GET(makeGetRequest({ schoolId: "s-1" }));
    expect(res.status).toBe(200);
  });

  it("scrubs userId from anonymous items in response", async () => {
    const anonItem = { ...baseFeedback, userId: "u-secret", isAnonymous: true };
    mockListFeedback.mockResolvedValue({ items: [anonItem], nextCursor: null });
    const res = await GET(makeGetRequest({ schoolId: "s-1" }));
    const body = await res.json();
    expect(body.items[0].userId).toBeNull();
  });
});

describe("GET /api/feedback/[id] (admin/committee only)", () => {
  it("returns 403 for parent", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/feedback/fi-1");
    const res = await getFeedbackById(req, { params: Promise.resolve({ id: "fi-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns feedback with null userId for anonymous item — even for admin", async () => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    const anonItem = { ...baseFeedback, userId: "u-secret", isAnonymous: true };
    mockFindUnique.mockResolvedValue(anonItem);
    const req = new NextRequest("http://localhost/api/feedback/fi-1");
    const res = await getFeedbackById(req, { params: Promise.resolve({ id: "fi-1" }) });
    const body = await res.json();
    expect(body.item.userId).toBeNull();
  });
});

describe("PATCH /api/feedback/[id] (moderation)", () => {
  it("allows committee to moderate", async () => {
    mockGetCurrentUser.mockResolvedValue(committeeUser);
    mockModerateFeedback.mockResolvedValue({ ...baseFeedback, status: "in_review" });
    const req = new NextRequest("http://localhost/api/feedback/fi-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "in_review", tenantId: "t-1", schoolId: "s-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchFeedback(req, { params: Promise.resolve({ id: "fi-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 403 for parent trying to moderate", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const req = new NextRequest("http://localhost/api/feedback/fi-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "in_review" }),
      headers: { "content-type": "application/json" },
    });
    const res = await patchFeedback(req, { params: Promise.resolve({ id: "fi-1" }) });
    expect(res.status).toBe(403);
  });
});
