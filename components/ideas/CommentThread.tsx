"use client";
import { useState, useEffect, useCallback } from "react";
import { CommentLikeButton } from "./CommentLikeButton";

interface Comment {
  id: string;
  ideaId: string;
  userId: string;
  body: string;
  createdAt: string;
  likeCount: number;
  hasLiked: boolean;
  isOwn: boolean;
}

interface CommentThreadProps {
  ideaId: string;
}

export function CommentThread({ ideaId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const url = `/api/ideas/${ideaId}/comments${cursor ? `?cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) { setLoadError("Nepodařilo se načíst komentáře."); return; }
    setLoadError(null);
    const data = await res.json() as { items: Comment[]; nextCursor: string | null };
    setComments((prev) => cursor ? [...prev, ...data.items] : data.items);
    setNextCursor(data.nextCursor);
  }, [ideaId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const d = await res.json() as Comment & { error?: { message?: string } };
      if (!res.ok) throw new Error((d as unknown as { error?: { message?: string } }).error?.message ?? "Chyba");
      setComments((prev) => [...prev, d]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="comments" className="mt-6">
      <h3 className="font-semibold text-gray-900 mb-4">Diskuse ({comments.length})</h3>

      {loading && <p className="text-sm text-gray-400">Načítám...</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <div className="space-y-3 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex-1">
              <p className="text-sm text-gray-800">{c.body}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString("cs-CZ")}</p>
            </div>
            <CommentLikeButton
              ideaId={ideaId}
              commentId={c.id}
              initialCount={c.likeCount}
              initialLiked={c.hasLiked}
              isOwn={c.isOwn}
            />
          </div>
        ))}
      </div>

      {nextCursor && (
        <button
          onClick={() => load(nextCursor)}
          className="text-sm text-blue-600 hover:underline mb-4"
        >
          Načíst další
        </button>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Přidat komentář..."
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "..." : "Odeslat"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}
