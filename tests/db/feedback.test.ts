import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindMany, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    feedbackItem: {
      create: mockCreate,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

import { createFeedback, listFeedback, moderateFeedback } from "@/lib/db/feedback";
import { NotFoundError } from "@/types/errors";

const baseItem = {
  id: "fi-1",
  schoolId: "s-1",
  classId: null,
  userId: "u-1",
  isAnonymous: false,
  categories: ["obecne"],
  type: "praise",
  text: "Great work!",
  status: "new",
  moderatedBy: null,
  assignedTo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("createFeedback", () => {
  it("stores userId for non-anonymous feedback", async () => {
    mockCreate.mockResolvedValue(baseItem);
    await createFeedback({
      schoolId: "s-1",
      userId: "u-1",
      isAnonymous: false,
      categories: ["obecne"],
      type: "praise",
      text: "Great work!",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u-1" }) }),
    );
  });

  it("strips userId for anonymous feedback", async () => {
    mockCreate.mockResolvedValue({ ...baseItem, userId: null, isAnonymous: true });
    await createFeedback({
      schoolId: "s-1",
      userId: "u-1",
      isAnonymous: true,
      categories: ["obecne"],
      type: "complaint",
      text: "Something bad",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: null }) }),
    );
  });

  it("sets initial status to 'new'", async () => {
    mockCreate.mockResolvedValue(baseItem);
    await createFeedback({
      schoolId: "s-1",
      isAnonymous: false,
      categories: ["obecne"],
      type: "praise",
      text: "x",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "new" }) }),
    );
  });
});

describe("listFeedback", () => {
  it("returns paginated items without cursor", async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ ...baseItem, id: `fi-${i}` }));
    mockFindMany.mockResolvedValue(items);
    const result = await listFeedback("s-1", { limit: 20 });
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it("filters by status when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    await listFeedback("s-1", { status: "reviewed" });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "reviewed" }) }),
    );
  });
});

describe("moderateFeedback", () => {
  it("throws NotFoundError when item does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(moderateFeedback("missing", "mod-1", "reviewed")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("updates status and moderatedBy", async () => {
    mockFindUnique.mockResolvedValue(baseItem);
    mockUpdate.mockResolvedValue({ ...baseItem, status: "reviewed", moderatedBy: "mod-1" });
    const result = await moderateFeedback("fi-1", "mod-1", "reviewed");
    expect(result.status).toBe("reviewed");
    expect(result.moderatedBy).toBe("mod-1");
  });
});
