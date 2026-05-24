import { AppError } from "@/types/errors";

export async function enhanceMessage(
  content: string,
  requestId?: string,
): Promise<string> {
  const baseUrl = process.env.AI_SERVICE_BASE_URL;
  if (!baseUrl) {
    throw new AppError("AI_ENHANCE_FAILED", "AI_SERVICE_BASE_URL is not configured", 500);
  }

  const prompt = `You are a communication assistant for a Czech school parent committee.
Enhance the following message to:
- Be polite, warm, and visually engaging
- Use separate paragraphs and bullet points for key points
- Bold or emphasize key words (use markdown **bold**)
- End with a clear, motivating Call-to-Action
- Encourage the reader to respond positively and take action
- Keep the original meaning intact
- Write in Czech

Input message:
${content}

Output only the enhanced message, nothing else.`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/text/enhance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "x-request-id": requestId } : {}),
      },
      body: JSON.stringify({ prompt, content }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new AppError("UPSTREAM_TIMEOUT", "Časový limit AI služby vypršel", 504);
    }
    throw new AppError("AI_ENHANCE_FAILED", "Nelze dosáhnout AI služby", 502);
  }

  if (!res.ok) {
    throw new AppError("AI_ENHANCE_FAILED", "AI služba vrátila chybu", 502);
  }

  const data = await res.json() as { result?: string; enhanced?: string; text?: string };
  const enhanced = data.result ?? data.enhanced ?? data.text;
  if (!enhanced || typeof enhanced !== "string") {
    throw new AppError("AI_ENHANCE_FAILED", "AI služba vrátila neočekávaný formát", 502);
  }

  return enhanced.trim();
}
