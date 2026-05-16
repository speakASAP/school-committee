import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("callCategorizeAI", () => {
  const originalEnv = process.env.AI_SERVICE_BASE_URL;

  beforeEach(() => {
    process.env.AI_SERVICE_BASE_URL = "http://ai-test:3380";
  });

  afterEach(() => {
    process.env.AI_SERVICE_BASE_URL = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns categories from AI service", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ categories: ["bezpecnost", "vybaveni"] }),
    }));

    const { callCategorizeAI } = await import("@/lib/ai/categorize");
    const result = await callCategorizeAI("Hřiště je nebezpečné", "complaint");
    expect(result).toEqual(["bezpecnost", "vybaveni"]);
  });

  it("returns ['obecne'] as fallback when AI service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const { callCategorizeAI } = await import("@/lib/ai/categorize");
    const result = await callCategorizeAI("Something", "suggestion");
    expect(result).toEqual(["obecne"]);
  });

  it("returns ['obecne'] as fallback when AI returns non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      text: async () => "Internal Server Error",
    }));

    const { callCategorizeAI } = await import("@/lib/ai/categorize");
    const result = await callCategorizeAI("Something", "suggestion");
    expect(result).toEqual(["obecne"]);
  });

  it("filters out unknown slugs from AI response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ categories: ["bezpecnost", "unknown_slug", "akce"] }),
    }));

    const { callCategorizeAI } = await import("@/lib/ai/categorize");
    const result = await callCategorizeAI("Test", "suggestion");
    expect(result).toEqual(["bezpecnost", "akce"]);
  });

  it("falls back to ['obecne'] when filtered result is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ categories: ["unknown1", "unknown2"] }),
    }));

    const { callCategorizeAI } = await import("@/lib/ai/categorize");
    const result = await callCategorizeAI("Test", "suggestion");
    expect(result).toEqual(["obecne"]);
  });

  it("sends text and type to the AI service", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ categories: ["finance"] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { callCategorizeAI } = await import("@/lib/ai/categorize");
    await callCategorizeAI("Budget request", "suggestion", "req-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://ai-test:3380/categorize",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-request-id": "req-123",
        }),
        body: JSON.stringify({ text: "Budget request", type: "suggestion" }),
      }),
    );
  });
});
