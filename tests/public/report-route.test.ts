import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFindMany, mockAggregate, mockTaskCount, mockTaskFindMany, mockProfileFindUnique } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockAggregate: vi.fn(),
  mockTaskCount: vi.fn(),
  mockTaskFindMany: vi.fn(),
  mockProfileFindUnique: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    expense: { findMany: mockFindMany, aggregate: mockAggregate },
    paymentIntent: { aggregate: mockAggregate },
    task: { count: mockTaskCount, findMany: mockTaskFindMany },
    profile: { findUnique: mockProfileFindUnique },
  },
}));

import { GET } from "@/app/api/public/report/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockAggregate.mockResolvedValue({ _sum: { amountCzk: null } });
  mockTaskCount.mockResolvedValue(0);
  mockTaskFindMany.mockResolvedValue([]);
  mockProfileFindUnique.mockResolvedValue(null);
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

  it("does not treat the task creator as the responsible person", async () => {
    mockTaskFindMany.mockResolvedValue([
      {
        id: "t-unassigned",
        title: "Natírání radiátorů",
        description: "Brigáda",
        status: "open",
        priority: "normal",
        deadline: null,
        assignedTo: null,
        createdBy: "u-creator",
        createdAt: new Date(),
        statusEvents: [],
      },
      {
        id: "t-assigned",
        title: "Web",
        description: "Stránky",
        status: "completed",
        priority: "normal",
        deadline: null,
        assignedTo: "u-assignee",
        createdBy: "u-creator",
        createdAt: new Date(),
        statusEvents: [],
      },
    ]);
    mockProfileFindUnique.mockResolvedValue({
      firstName: "Sergej",
      lastName: "Stašok",
      titleBefore: "Ing.",
      titleAfter: null,
    });

    const req = new NextRequest("http://localhost/api/public/report?schoolId=s-1");
    const res = await GET(req);
    const body = await res.json();

    expect(body.allTasks[0].responsibleName).toBeNull();
    expect(body.allTasks[1].responsibleName).toBe("Ing. Sergej Stašok");
    expect(mockProfileFindUnique).toHaveBeenCalledTimes(1);
    expect(mockProfileFindUnique).toHaveBeenCalledWith({
      where: { userId: "u-assignee" },
      select: { firstName: true, lastName: true, titleBefore: true, titleAfter: true },
    });
  });
});
