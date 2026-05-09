import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockUpsertProfile, mockGetProfile, mockWriteAuditEvent } = vi.hoisted(
  () => ({
    mockGetCurrentUser: vi.fn(),
    mockUpsertProfile: vi.fn(),
    mockGetProfile: vi.fn(),
    mockWriteAuditEvent: vi.fn(),
  }),
);

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/db/profiles", () => ({
  upsertProfile: mockUpsertProfile,
  getProfile: mockGetProfile,
}));
vi.mock("@/lib/db/audit", () => ({ writeAuditEvent: mockWriteAuditEvent }));

import { POST } from "@/app/api/onboarding/profile/route";

const user = { id: "u-1", email: "parent@test.com", roles: ["parent"] };

const validBody = {
  tenantId: "t-1",
  schoolId: "s-1",
  firstName: "Jana",
  lastName: "Nováková",
  language: "cs",
  classId: "cls-1",
  childrenCount: 1,
  participationType: "financial",
};

const mockProfile = {
  userId: "u-1",
  tenantId: "t-1",
  schoolId: "s-1",
  firstName: "Jana",
  lastName: "Nováková",
  phone: null,
  language: "cs",
  participationType: "financial",
  onboardingStatus: "profile_complete",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/onboarding/profile", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(user);
  mockGetProfile.mockRejectedValue(new Error("not found"));
  mockUpsertProfile.mockResolvedValue(mockProfile);
  mockWriteAuditEvent.mockResolvedValue(undefined);
});

describe("POST /api/onboarding/profile", () => {
  it("creates profile and returns 201", async () => {
    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.profile.userId).toBe("u-1");
  });

  it("returns 401 when unauthenticated", async () => {
    const { UnauthenticatedError } = await import("@/types/errors");
    mockGetCurrentUser.mockRejectedValue(new UnauthenticatedError());
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when firstName is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, firstName: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lastName is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, lastName: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when classId is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, classId: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid participationType", async () => {
    const res = await POST(makeRequest({ ...validBody, participationType: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid language", async () => {
    const res = await POST(makeRequest({ ...validBody, language: "fr" }));
    expect(res.status).toBe(400);
  });

  it("allows phone to be omitted (optional field)", async () => {
    const bodyWithoutPhone = { ...validBody };
    const res = await POST(makeRequest(bodyWithoutPhone));
    expect(res.status).toBe(201);
    expect(mockUpsertProfile).toHaveBeenCalledWith(
      user.id,
      expect.not.objectContaining({ phone: expect.anything() }),
    );
  });

  it("blocks already-completed onboarding with 403", async () => {
    mockGetProfile.mockResolvedValue({ ...mockProfile, onboardingStatus: "complete" });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("writes audit event on success", async () => {
    await POST(makeRequest(validBody));
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "onboarding.profile_created" }),
    );
  });
});

describe("onboarding profile form constraints", () => {
  it("profile form does not include a child full name field", () => {
    // Children section only collects count and optionally birth year — no full name
    const formFields = ["firstName", "lastName", "phone", "classId", "childrenCount", "childBirthYears", "participationType", "language"];
    expect(formFields).not.toContain("childFullName");
    expect(formFields).not.toContain("childName");
  });
});
