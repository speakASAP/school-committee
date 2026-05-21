import { AppError } from "@/types/errors";

export interface TaskDraftInput {
  transcript?: string;
  textNote?: string;
  language?: string;
}

export interface TaskDraftResult {
  title: string;
  description: string;
  priority: "low" | "normal" | "high";
  deadline?: string;
  modelTier: string;
}

export async function callTaskDraftAI(
  input: TaskDraftInput,
  requestId?: string,
): Promise<TaskDraftResult> {
  const baseUrl = process.env.AI_SERVICE_BASE_URL;
  if (!baseUrl) {
    throw new AppError("AI_DRAFT_FAILED", "AI_SERVICE_BASE_URL is not configured", 500);
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/task/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "x-request-id": requestId } : {}),
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new AppError("UPSTREAM_TIMEOUT", "Časový limit AI služby vypršel", 504);
    }
    throw new AppError("AI_DRAFT_FAILED", `AI service unreachable: ${String(err)}`, 502);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new AppError("AI_DRAFT_FAILED", `AI draft failed: ${errText.slice(0, 200)}`, 500);
  }

  const json = await res.json() as Record<string, unknown>;
  if (
    typeof json.title !== "string" ||
    typeof json.description !== "string" ||
    !["low", "normal", "high"].includes(json.priority as string)
  ) {
    throw new AppError("AI_DRAFT_FAILED", "Odpověď AI neobsahuje povinná pole", 500);
  }
  return {
    title: json.title as string,
    description: json.description as string,
    priority: json.priority as "low" | "normal" | "high",
    deadline: typeof json.deadline === "string" ? json.deadline : undefined,
    modelTier: typeof json.modelTier === "string" ? json.modelTier : "smart",
  };
}
