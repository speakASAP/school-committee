"use client";
import { useState, useEffect } from "react";
import { IDEA_ADMIN_STATUSES, STATUS_LABEL, STATUS_COLOR } from "@/lib/statuses";

interface AdminIdea {
  id: string;
  title: string;
  description: string;
  submittedBy: string | null;
  isAnonymous: boolean;
  voteCount: number;
  commentCount: number;
  status: string;
  categories: string[];
  createdAt: string;
}

const STATUS_OPTIONS = [...IDEA_ADMIN_STATUSES];

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<AdminIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  function loadIdeas() {
    setLoading(true);
    const url = new URL("/api/ideas", window.location.origin);
    url.searchParams.set("admin", "1");
    url.searchParams.set("limit", "200");
    if (filterStatus) url.searchParams.set("status", filterStatus);
    fetch(url.toString())
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d: { items: AdminIdea[] }) => setIdeas(d.items ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadIdeas(); }, [filterStatus]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/ideas/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
      } else {
        const body = await res.json();
        alert(body.error?.message ?? "Aktualizace selhala");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteIdea(id: string) {
    if (!confirm("Smazat tento nápad?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      if (res.ok) setIdeas((prev) => prev.filter((i) => i.id !== id));
      else {
        const body = await res.json();
        alert(body.error?.message ?? "Smazání selhalo");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Nápady</h1>
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Všechny stavy</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">Načítám…</p>}

      {!loading && ideas.length === 0 && (
        <p className="text-gray-400 text-sm">Žádné nápady.</p>
      )}

      <div className="space-y-3">
        {ideas.map((idea) => (
          <div key={idea.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{idea.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{idea.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[idea.status] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABEL[idea.status] ?? idea.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>{idea.isAnonymous ? "Anonymní" : (idea.submittedBy ?? "–")}</span>
              <span>·</span>
              <span>{idea.voteCount} hlasů</span>
              <span>·</span>
              <span>{idea.commentCount} komentářů</span>
              {idea.categories.length > 0 && (
                <>
                  <span>·</span>
                  <span>{idea.categories.join(", ")}</span>
                </>
              )}
              <span>·</span>
              <span>{new Date(idea.createdAt).toLocaleDateString("cs-CZ")}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <select
                className="border rounded px-2 py-1 text-xs"
                value={idea.status}
                onChange={(e) => updateStatus(idea.id, e.target.value)}
                disabled={updatingId === idea.id}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                ))}
              </select>
              <a
                href={`/ideas/${idea.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-3 py-1"
              >
                Zobrazit
              </a>
              <button
                onClick={() => deleteIdea(idea.id)}
                disabled={deletingId === idea.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {deletingId === idea.id ? "…" : "Smazat"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
