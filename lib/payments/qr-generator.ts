import { AppError } from "@/types/errors";
import type { QrPayload } from "@/types/payments";

const MAX_AMOUNT_CZK = 1_000_000;

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
