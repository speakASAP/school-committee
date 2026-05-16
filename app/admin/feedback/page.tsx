"use client";
import { useState, useEffect } from "react";

interface FeedbackItem {
  id: string;
  type: string;
  text: string;
  status: string;
  isAnonymous: boolean;
  userId: string | null;
  categories: string[];
  voiceTranscript: string | null;
  createdAt: string;
}

const MODERATION_STATUSES = ["in_review", "resolved", "archived"];

const STATUS_LABEL: Record<string, string> = {
  new: "Nové",
  in_review: "V řešení",
  resolved: "Vyřešeno",
  archived: "Archivováno",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_review: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};

const TYPE_LABEL: Record<string, string> = {
  suggestion: "Návrh",
  complaint: "Stížnost",
  praise: "Pochvala",
  question: "Dotaz",
  issue: "Problém",
  other: "Ostatní",
};

export default function FeedbackAdminPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = new URL("/api/feedback", window.location.origin);
    url.searchParams.set("limit", "100");
    if (filterStatus) url.searchParams.set("status", filterStatus);
    fetch(url.toString())
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Opravdu smazat tuto zpětnou vazbu?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
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
        <h1 className="text-xl font-bold">Zpětná vazba</h1>
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Všechny stavy</option>
          <option value="new">Nové</option>
          <option value="in_review">V řešení</option>
          <option value="resolved">Vyřešeno</option>
          <option value="archived">Archivováno</option>
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">Načítám…</p>}

      {!loading && items.length === 0 && (
        <p className="text-gray-400 text-sm">Žádná zpětná vazba.</p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {TYPE_LABEL[item.type] ?? item.type}
                </span>
                {item.isAnonymous && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">anonymní</span>
                )}
                {item.categories.length > 0 && (
                  <span className="text-xs text-gray-400">{item.categories.join(", ")}</span>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(item.createdAt).toLocaleString("cs-CZ", { hour12: false })}
              </span>
            </div>

            <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.text}</p>

            {item.voiceTranscript && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-600 mb-1">Přepis hlasu</p>
                <p className="text-sm text-blue-900">{item.voiceTranscript}</p>
              </div>
            )}

            {!item.isAnonymous && item.userId && (
              <p className="text-xs text-gray-400">
                Autor: <span className="font-mono">{item.userId}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <select
                className="border rounded px-2 py-1 text-xs"
                value={item.status}
                onChange={(e) => updateStatus(item.id, e.target.value)}
                disabled={updatingId === item.id}
              >
                <option value="new">Nové</option>
                {MODERATION_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                ))}
              </select>
              <button
                onClick={() => updateStatus(item.id, item.status)}
                disabled={updatingId === item.id}
                className="text-xs bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50"
              >
                {updatingId === item.id ? "Ukládám…" : "Uložit stav"}
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                disabled={deletingId === item.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {deletingId === item.id ? "…" : "Smazat"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
