import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFindMany, mockAggregate, mockTaskCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockAggregate: vi.fn(),
  mockTaskCount: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    expense: { findMany: mockFindMany, aggregate: mockAggregate },
    paymentIntent: { aggregate: mockAggregate },
    task: { count: mockTaskCount },
  },
}));

import { GET } from "@/app/api/public/report/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockAggregate.mockResolvedValue({ _sum: { amountCzk: null } });
  mockTaskCount.mockResolvedValue(0);
});

describe("GET /api/public/report", () => {
  it("returns 400 when schoolId is missing", async () => {
    const req = new NextRequest("http://localhost/api/public/report");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns report shape with zero amounts when no data", async () => {
    const req = new NextRequest("http://localhost/api/public/report?schoolId=s-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      totalCollectedCzk: 0,
      totalSpentCzk: 0,
      balanceCzk: 0,
      completedTaskCount: 0,
      expenses: [],
    });
  });

  it("does not require auth (no error for missing token)", async () => {
    const req = new NextRequest("http://localhost/api/public/report?schoolId=s-1");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("returns only public expenses", async () => {
    mockFindMany.mockResolvedValue([
      { id: "e-1", title: "Paint", category: "supplies", amountCzk: 500, spentAt: new Date(), publicVisible: true },
    ]);
    const req = new NextRequest("http://localhost/api/public/report?schoolId=s-1");
    const res = await GET(req);
    const body = await res.json();
    expect(body.expenses).toHaveLength(1);
    expect(body.expenses[0].id).toBe("e-1");
  });
});
