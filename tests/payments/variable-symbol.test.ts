import { describe, it, expect } from "vitest";
import { generateVariableSymbol } from "@/lib/payments/variable-symbol";

describe("generateVariableSymbol", () => {
  it("produces exactly 10 characters", () => {
    const vs = generateVariableSymbol();
    expect(vs).toHaveLength(10);
  });

  it("produces numeric-only strings", () => {
    for (let i = 0; i < 20; i++) {
      const vs = generateVariableSymbol();
      expect(vs).toMatch(/^\d{10}$/);
    }
  });

  it("produces unique values across 1000 calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const vs = generateVariableSymbol();
      expect(seen.has(vs), `Duplicate variable symbol: ${vs}`).toBe(false);
      seen.add(vs);
    }
    expect(seen.size).toBe(1000);
  });

  it("embeds current year and month prefix (YYMM)", () => {
    const vs = generateVariableSymbol();
    const now = new Date();
    const yy = String(now.getUTCFullYear()).slice(-2);
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    expect(vs.startsWith(`${yy}${mm}`)).toBe(true);
  });
});
