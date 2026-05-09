import { describe, it, expect } from "vitest";
import { buildPage, resolveLimit } from "@/lib/db/pagination";

describe("resolveLimit", () => {
  it("returns default 20 when undefined", () => {
    expect(resolveLimit(undefined)).toBe(20);
  });

  it("returns default 20 for zero or negative (invalid input)", () => {
    expect(resolveLimit(0)).toBe(20);
    expect(resolveLimit(-5)).toBe(20);
  });

  it("clamps to maximum 100", () => {
    expect(resolveLimit(200)).toBe(100);
  });

  it("returns the given value within range", () => {
    expect(resolveLimit(10)).toBe(10);
    expect(resolveLimit(50)).toBe(50);
  });
});

describe("buildPage", () => {
  const makeRow = (id: string) => ({ id });

  it("returns empty items and null cursor when no rows", () => {
    const result = buildPage([], 20);
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("returns all items and null cursor when fewer than limit", () => {
    const rows = [makeRow("a"), makeRow("b")];
    const result = buildPage(rows, 20);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it("returns limit items and cursor when more rows exist", () => {
    const rows = Array.from({ length: 21 }, (_, i) => makeRow(`id-${i}`));
    const result = buildPage(rows, 20);
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("id-19");
  });

  it("cursor is the id of the last returned item", () => {
    const rows = [makeRow("x"), makeRow("y"), makeRow("z")]; // limit=2 → overflow
    const result = buildPage(rows, 2);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("y");
  });
});
