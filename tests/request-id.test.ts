import { describe, it, expect } from "vitest";
import { generateRequestId, getOrCreateRequestId } from "@/lib/request-id";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateRequestId", () => {
  it("returns a valid UUID v4", () => {
    const id = generateRequestId();
    expect(id).toMatch(UUID_V4_RE);
  });

  it("returns unique values on each call", () => {
    const ids = new Set(Array.from({ length: 100 }, generateRequestId));
    expect(ids.size).toBe(100);
  });
});

describe("getOrCreateRequestId", () => {
  it("returns existing id when provided", () => {
    const existing = "550e8400-e29b-41d4-a716-446655440000";
    expect(getOrCreateRequestId(existing)).toBe(existing);
  });

  it("generates new id when given null", () => {
    const id = getOrCreateRequestId(null);
    expect(id).toMatch(UUID_V4_RE);
  });

  it("generates new id when given undefined", () => {
    const id = getOrCreateRequestId(undefined);
    expect(id).toMatch(UUID_V4_RE);
  });
});
