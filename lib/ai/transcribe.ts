const AI_SERVICE_URL =
  process.env.AI_SERVICE_BASE_URL ??
  "http://ai-microservice.statex-apps.svc.cluster.local:3380";

export async function transcribeVoice(fileKey: string, language?: string): Promise<string> {
  const res = await fetch(`${AI_SERVICE_URL}/voice/transcribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileKey, language }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voice transcription failed: ${body}`);
  }

  const data = (await res.json()) as { transcript?: string };
  return data.transcript ?? "";
}
