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

import { POST as consentPost } from "@/app/api/onboarding/consent/route";

const user = { id: "u-1", email: "parent@test.com", roles: ["parent"] };

const validConsent = {
  tenantId: "t-1",
  schoolId: "s-1",
  consent: {
    termsAccepted: true,
    privacyPolicyAccepted: true,
    parentCommitteeParticipation: true,
    version: "1.0",
    timestamp: new Date().toISOString(),
  },
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/onboarding/consent", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(user);
  mockUpsertProfile.mockResolvedValue({});
  mockWriteAuditEvent.mockResolvedValue(undefined);
});

describe("POST /api/onboarding/consent", () => {
  it("records consent and returns 200 with timestamp", async () => {
    const res = await consentPost(makeRequest(validConsent));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.recorded).toBe(true);
    expect(body.timestamp).toBeTruthy();
  });

  it("includes version, timestamp, all types in audit event metadata", async () => {
    await consentPost(makeRequest(validConsent));
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "onboarding.consent_recorded",
        metadata: expect.objectContaining({
          termsAccepted: true,
          privacyPolicyAccepted: true,
          parentCommitteeParticipation: true,
          version: "1.0",
        }),
      }),
    );
  });

  it("rejects when termsAccepted is false", async () => {
    const body = {
      ...validConsent,
      consent: { ...validConsent.consent, termsAccepted: false },
    };
    const res = await consentPost(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects when privacyPolicyAccepted is false", async () => {
    const body = {
      ...validConsent,
      consent: { ...validConsent.consent, privacyPolicyAccepted: false },
    };
    const res = await consentPost(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects when parentCommitteeParticipation is false", async () => {
    const body = {
      ...validConsent,
      consent: { ...validConsent.consent, parentCommitteeParticipation: false },
    };
    const res = await consentPost(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("rejects when consent version is missing", async () => {
    const body = {
      ...validConsent,
      consent: { ...validConsent.consent, version: "" },
    };
    const res = await consentPost(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { UnauthenticatedError } = await import("@/types/errors");
    mockGetCurrentUser.mockRejectedValue(new UnauthenticatedError());
    const res = await consentPost(makeRequest(validConsent));
    expect(res.status).toBe(401);
  });

  it("marks profile onboarding status as complete", async () => {
    await consentPost(makeRequest(validConsent));
    expect(mockUpsertProfile).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ onboardingStatus: "complete" }),
    );
  });
});
