import { randomUUID } from "crypto";

export function generateRequestId(): string {
  return randomUUID();
}

export function getOrCreateRequestId(
  headerValue: string | null | undefined
): string {
  return headerValue ?? generateRequestId();
}
