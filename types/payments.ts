export interface QrPayload {
  variableSymbol: string;
  amountCzk: number;
  currency: "CZK";
  message: string;
  qrString: string;
}

export interface CreatePaymentQrRequest {
  schoolId: string;
  planId?: string;
  amountCzk: number;
  message?: string;
}

export interface CreatePaymentQrResponse {
  paymentIntentId: string;
  variableSymbol: string;
  amountCzk: number;
  qrString: string;
  expiresAt: string;
}
