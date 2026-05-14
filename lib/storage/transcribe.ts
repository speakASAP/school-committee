import { AppError } from "@/types/errors";

export async function transcribeAudioFile(fileKey: string, requestId?: string): Promise<string> {
  const baseUrl = process.env.AI_SERVICE_BASE_URL;
  if (!baseUrl) throw new AppError("INTERNAL_ERROR", "AI_SERVICE_BASE_URL not configured", 500);

  const res = await fetch(`${baseUrl}/voice/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
    body: JSON.stringify({ fileKey }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new AppError("INTERNAL_ERROR", `Transcription failed: ${errText.slice(0, 200)}`, 500);
  }

  const body = await res.json() as { transcript: string };
  return body.transcript ?? "";
}
