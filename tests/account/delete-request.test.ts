import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockWriteAuditEvent } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockWriteAuditEvent: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/db/audit", () => ({ writeAuditEvent: mockWriteAuditEvent }));

import { POST } from "@/app/api/account/delete-request/route";

const user = { id: "u-1", email: "parent@test.com", roles: ["parent"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(user);
  mockWriteAuditEvent.mockResolvedValue(undefined);
});

describe("POST /api/account/delete-request", () => {
  it("returns 200 and writes audit event for authenticated user", async () => {
    const req = new NextRequest("http://localhost/api/account/delete-request", {
      method: "POST",
      body: JSON.stringify({ tenantId: "t-1", schoolId: "s-1", reason: "No longer using the platform" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "account.deletion_requested",
        actorUserId: "u-1",
      }),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401, code: "UNAUTHORIZED" }),
    );
    const req = new NextRequest("http://localhost/api/account/delete-request", {
      method: "POST",
      body: JSON.stringify({ tenantId: "t-1", schoolId: "s-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when tenantId is missing", async () => {
    const req = new NextRequest("http://localhost/api/account/delete-request", {
      method: "POST",
      body: JSON.stringify({ schoolId: "s-1" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
