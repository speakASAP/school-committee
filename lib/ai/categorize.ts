export const ALLOWED_CATEGORIES = [
  "bezpecnost", "vybaveni", "ucitele", "akce", "finance",
  "komunikace", "administrativa", "jidelna", "sport",
  "kultura", "prostory", "obecne",
] as const;

export type CategorySlug = typeof ALLOWED_CATEGORIES[number];

export async function callCategorizeAI(
  text: string,
  type: string,
  requestId?: string,
): Promise<string[]> {
  const baseUrl = process.env.AI_SERVICE_BASE_URL;
  if (!baseUrl) return ["obecne"];

  try {
    const res = await fetch(`${baseUrl}/categorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "x-request-id": requestId } : {}),
      },
      body: JSON.stringify({ text, type }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return ["obecne"];

    const json = await res.json() as Record<string, unknown>;
    if (!Array.isArray(json.categories)) return ["obecne"];

    const valid = (json.categories as unknown[])
      .filter((c): c is string => typeof c === "string")
      .filter((c) => (ALLOWED_CATEGORIES as readonly string[]).includes(c));

    return valid.length > 0 ? valid : ["obecne"];
  } catch {
    return ["obecne"];
  }
}
