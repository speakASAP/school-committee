import { logger } from "@/lib/logger";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_BASE_URL ??
  "http://ai-microservice.statex-apps.svc.cluster.local:3380";

export async function transcribeVoice(fileKey: string, language?: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${AI_SERVICE_URL}/voice/transcribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileKey, language }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    logger.error("transcribe: failed to reach ai-microservice", {
      error_code: "AI_SERVICE_UNREACHABLE",
      error_message: err instanceof Error ? err.message : String(err),
      error_name: err instanceof Error ? err.name : undefined,
      file_key: fileKey,
    });
    throw new Error(`Voice transcription request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    logger.error("transcribe: ai-microservice returned error", {
      error_code: "AI_SERVICE_ERROR",
      status_code: res.status,
      upstream_body: body,
      file_key: fileKey,
    });
    throw new Error(`Voice transcription failed: ${body}`);
  }

  const data = (await res.json()) as { transcript?: string };
  return data.transcript ?? "";
}
