import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockCreatePaymentIntent, mockWriteAuditEvent, mockGenerateVs, mockGenerateQr } =
  vi.hoisted(() => ({
    mockGetCurrentUser: vi.fn(),
    mockCreatePaymentIntent: vi.fn(),
    mockWriteAuditEvent: vi.fn(),
    mockGenerateVs: vi.fn(),
    mockGenerateQr: vi.fn(),
  }));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/db/payments", () => ({ createPaymentIntent: mockCreatePaymentIntent }));
vi.mock("@/lib/db/audit", () => ({ writeAuditEvent: mockWriteAuditEvent }));
vi.mock("@/lib/payments/variable-symbol", () => ({ generateVariableSymbol: mockGenerateVs }));
vi.mock("@/lib/payments/qr-generator", () => ({
  generateQrPayload: mockGenerateQr,
  validateAmount: vi.fn(),
}));

import { POST } from "@/app/api/payments/qr/route";

const parentUser = { id: "u-1", email: "parent@test.com", roles: ["parent"] };

const mockIntent = {
  id: "pi-1",
  schoolId: "s-1",
  userId: "u-1",
  planId: null,
  amountCzk: 500,
  currency: "CZK",
  variableSymbol: "2605000001",
  message: null,
  status: "pending",
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000 * 30),
  paidAt: null,
};

function makeRequest(body: unknown, envVars?: Record<string, string>) {
  for (const [k, v] of Object.entries(envVars ?? {})) process.env[k] = v;
  return new NextRequest("http://localhost/api/payments/qr", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PAYMENT_ACCOUNT_NUMBER = "123456789";
  process.env.PAYMENT_BANK_CODE = "0100";
  process.env.PAYMENT_ACCOUNT_IBAN = "CZ6508000000192000145399";
});

describe("POST /api/payments/qr", () => {
  it("returns 201 with QR data for authenticated parent", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    mockGenerateVs.mockReturnValue("2605000001");
    mockCreatePaymentIntent.mockResolvedValue(mockIntent);
    mockWriteAuditEvent.mockResolvedValue(undefined);
    mockGenerateQr.mockReturnValue({
      variableSymbol: "2605000001",
      amountCzk: 500,
      currency: "CZK",
      message: "",
      qrString: "SPD*1.0*ACC:CZ65...*AM:500.00*CC:CZK*X-VS:2605000001",
    });

    const req = makeRequest({ schoolId: "s-1", amountCzk: 500 });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.variableSymbol).toBe("2605000001");
    expect(body.qrString).toContain("SPD");
    expect(body.paymentIntentId).toBe("pi-1");
  });

  it("returns 401 when unauthenticated", async () => {
    const { UnauthenticatedError } = await import("@/types/errors");
    mockGetCurrentUser.mockRejectedValue(new UnauthenticatedError());

    const req = makeRequest({ schoolId: "s-1", amountCzk: 500 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when schoolId is missing", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);

    const req = makeRequest({ amountCzk: 500 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("does not expose IBAN in response body", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    mockGenerateVs.mockReturnValue("2605000001");
    mockCreatePaymentIntent.mockResolvedValue(mockIntent);
    mockWriteAuditEvent.mockResolvedValue(undefined);
    mockGenerateQr.mockReturnValue({
      variableSymbol: "2605000001",
      amountCzk: 500,
      currency: "CZK",
      message: "",
      qrString: "SPD*1.0*ACC:HIDDEN*AM:500.00*CC:CZK",
    });

    const req = makeRequest({ schoolId: "s-1", amountCzk: 500 });
    const res = await POST(req);
    const text = await res.text();

    expect(text).not.toContain("CZ6508000000192000145399");
    expect(text).not.toContain("123456789");
  });
});
