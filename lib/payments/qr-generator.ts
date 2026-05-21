import { AppError } from "@/types/errors";
import type { QrPayload } from "@/types/payments";

const MAX_AMOUNT_CZK = 1_000_000;

// Returns the current Czech school year string, e.g. "2025/26"
export function currentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

// Builds a Czech QR payment message ≤60 chars (SPD MSG limit).
// Format: "Příspěvek ŠV 2025/26 Novák: Adam, Eva"
export function buildPaymentMessage(
  parentLastName: string,
  childrenFirstNames: string[],
  schoolYear?: string,
): string {
  const year = schoolYear ?? currentSchoolYear();
  const prefix = `Příspěvek ŠV ${year}`;
  if (!parentLastName && childrenFirstNames.length === 0) return prefix.slice(0, 60);

  const namePart = parentLastName ? ` ${parentLastName}` : "";
  const childPart = childrenFirstNames.length > 0 ? `: ${childrenFirstNames.join(", ")}` : "";
  const full = `${prefix}${namePart}${childPart}`;
  if (full.length <= 60) return full;

  // Truncate: try without children one by one from the end
  for (let i = childrenFirstNames.length - 1; i >= 0; i--) {
    const trimmed = `${prefix}${namePart}: ${childrenFirstNames.slice(0, i).join(", ")}`.slice(0, 60);
    if (trimmed.length <= 60) return trimmed;
  }
  return `${prefix}${namePart}`.slice(0, 60);
}

export interface QrGeneratorInput {
  accountNumber: string;
  bankCode: string;
  iban?: string;
  amountCzk: number;
  variableSymbol: string;
  message?: string;
}

export function validateAmount(amountCzk: number): void {
  if (!Number.isInteger(amountCzk) || amountCzk <= 0) {
    throw new AppError("VALIDATION_ERROR", "Částka musí být kladné celé číslo v CZK", 400);
  }
  if (amountCzk > MAX_AMOUNT_CZK) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Amount exceeds maximum allowed (${MAX_AMOUNT_CZK} CZK)`,
      400,
    );
  }
}

// Czech QR Platba (SPD) format: https://qr-platba.cz/pro-vyvojare/
export function buildQrString(input: QrGeneratorInput): string {
  validateAmount(input.amountCzk);

  const account = input.iban ?? `${input.accountNumber}/${input.bankCode}`;
  const amountFormatted = (input.amountCzk).toFixed(2);

  const parts = [
    "SPD*1.0",
    `ACC:${account}`,
    `AM:${amountFormatted}`,
    `CC:CZK`,
    `X-VS:${input.variableSymbol}`,
  ];

  if (input.message) {
    parts.push(`MSG:${input.message.slice(0, 60)}`);
  }

  return parts.join("*");
}

export function generateQrPayload(input: QrGeneratorInput): QrPayload {
  const qrString = buildQrString(input);
  return {
    variableSymbol: input.variableSymbol,
    amountCzk: input.amountCzk,
    currency: "CZK",
    message: input.message ?? "",
    qrString,
  };
}
