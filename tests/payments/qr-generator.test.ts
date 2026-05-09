import { describe, it, expect } from "vitest";
import { buildQrString, validateAmount } from "@/lib/payments/qr-generator";
import { AppError } from "@/types/errors";

const validInput = {
  accountNumber: "123456789",
  bankCode: "0100",
  amountCzk: 500,
  variableSymbol: "2605012345",
  message: "School contribution",
};

describe("validateAmount", () => {
  it("accepts valid positive integer", () => {
    expect(() => validateAmount(500)).not.toThrow();
  });

  it("rejects zero", () => {
    expect(() => validateAmount(0)).toThrow(AppError);
  });

  it("rejects negative amount", () => {
    expect(() => validateAmount(-100)).toThrow(AppError);
  });

  it("rejects non-integer (float)", () => {
    expect(() => validateAmount(99.5)).toThrow(AppError);
  });

  it("rejects amount above maximum (1 000 000 CZK)", () => {
    expect(() => validateAmount(1_000_001)).toThrow(AppError);
  });
});

describe("buildQrString", () => {
  it("produces SPD*1.0 prefix", () => {
    const result = buildQrString(validInput);
    expect(result).toMatch(/^SPD\*1\.0/);
  });

  it("includes account number and bank code", () => {
    const result = buildQrString(validInput);
    expect(result).toContain("ACC:123456789/0100");
  });

  it("uses IBAN when provided instead of account/code", () => {
    const result = buildQrString({ ...validInput, iban: "CZ6508000000192000145399" });
    expect(result).toContain("ACC:CZ6508000000192000145399");
    expect(result).not.toContain("123456789/0100");
  });

  it("formats amount as decimal with 2 places", () => {
    const result = buildQrString(validInput);
    expect(result).toContain("AM:500.00");
  });

  it("sets currency CZK", () => {
    const result = buildQrString(validInput);
    expect(result).toContain("CC:CZK");
  });

  it("includes variable symbol", () => {
    const result = buildQrString(validInput);
    expect(result).toContain("X-VS:2605012345");
  });

  it("includes message when provided", () => {
    const result = buildQrString(validInput);
    expect(result).toContain("MSG:School contribution");
  });

  it("omits MSG when no message provided", () => {
    const result = buildQrString({ ...validInput, message: undefined });
    expect(result).not.toContain("MSG:");
  });

  it("truncates message to 60 characters", () => {
    const longMsg = "A".repeat(80);
    const result = buildQrString({ ...validInput, message: longMsg });
    expect(result).toContain(`MSG:${"A".repeat(60)}`);
  });
});
