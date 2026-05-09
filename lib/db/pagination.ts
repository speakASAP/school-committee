export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PageParams {
  limit?: number;
  cursor?: string;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}

export function resolveLimit(raw?: number): number {
  if (!raw || raw < 1) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

export function buildPage<T extends { id: string }>(
  rows: T[],
  limit: number,
): PageResult<T> {
  if (rows.length <= limit) {
    return { items: rows, nextCursor: null };
  }
  const items = rows.slice(0, limit);
  return { items, nextCursor: items[items.length - 1]!.id };
}
