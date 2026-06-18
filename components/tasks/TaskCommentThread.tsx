"use client";
import { useState, useEffect, useCallback } from "react";
import { UserAvatar } from "@/components/UserAvatar";

interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  authorFirstName: string;
  authorAvatarUrl: string | null;
}

interface TaskCommentThreadProps {
  taskId: string;
  authed: boolean;
}

export function TaskCommentThread({ taskId, authed }: TaskCommentThreadProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}/comments`);
    if (!res.ok) {
      setLoadError("Nepodařilo se načíst komentáře.");
      return;
    }
    setLoadError(null);
    const data = (await res.json()) as { items: TaskComment[] };
    setComments(data.items);
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.status === 401) {
        window.location.href = `/login?next=/tasks/${taskId}`;
        return;
      }
      const d = (await res.json()) as TaskComment & {
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(d.error?.message ?? "Chyba");
      }
      setComments((prev) => [...prev, d]);
      setBody("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">
        Dotazy a komentáře ({comments.length})
      </h3>

      {loading && <p className="text-sm text-gray-400">Načítám…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {comments.length > 0 && (
        <div className="space-y-3 mb-5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-xl bg-gray-50 p-3">
              <UserAvatar
                avatarUrl={c.authorAvatarUrl}
                firstName={c.authorFirstName}
                lastName=""
                size="xs"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  {c.authorFirstName}
                </p>
                <p className="text-sm text-gray-800 break-words">{c.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.createdAt).toLocaleString("cs-CZ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">Zatím žádné komentáře.</p>
      )}

      {authed ? (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            rows={2}
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Napište dotaz nebo komentář…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {submitting ? "Odesílám…" : "Odeslat komentář"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500">
          <a
            href={`/login?next=/tasks/${taskId}`}
            className="text-blue-600 hover:underline font-medium"
          >
            Přihlaste se
          </a>{" "}
          pro přidání komentáře.
        </p>
      )}
    </div>
  );
}
