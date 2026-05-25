"use client";
import { useState, useEffect, useRef } from "react";
import { STATUS_LABEL as SHARED_STATUS_LABEL, STATUS_COLOR as SHARED_STATUS_COLOR } from "@/lib/statuses";

interface Reply {
  id: string;
  body: string;
  fromUserId: string;
  isFromCommittee: boolean;
  createdAt: string;
}

interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  titleBefore: string | null;
  titleAfter: string | null;
}

interface InboxItem {
  kind: "message" | "feedback" | "idea";
  id: string;
  userId: string | null;
  body: string;
  createdAt: string;
  status: string;
  user: UserProfile | null;
  replies?: Reply[];
  meta?: {
    type?: string;
    title?: string;
    categories?: string[];
    isAnonymous?: boolean;
    votes?: number;
    comments?: number;
  };
}

const KIND_LABEL: Record<string, string> = {
  message: "Zpráva",
  feedback: "Zpětná vazba",
  idea: "Nápad",
};

const KIND_COLOR: Record<string, string> = {
  message: "bg-blue-100 text-blue-700",
  feedback: "bg-yellow-100 text-yellow-700",
  idea: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL = SHARED_STATUS_LABEL;
const STATUS_COLOR = SHARED_STATUS_COLOR;

const FEEDBACK_TYPE: Record<string, string> = {
  suggestion: "Návrh", complaint: "Stížnost", praise: "Pochvala",
  question: "Dotaz", issue: "Problém", other: "Ostatní",
};

function formatName(u: UserProfile | null, isAnonymous?: boolean): string {
  if (isAnonymous || !u) return "Anonymní";
  return [u.titleBefore, u.firstName, u.lastName, u.titleAfter].filter(Boolean).join(" ");
}

export default function AdminMessagesPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, string>>({});
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    load();
  }, [filter]);

  function load() {
    setLoading(true);
    fetch(`/api/admin/inbox?type=${filter}&limit=100`)
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => {
        setItems(d.items ?? []);
        const statuses: Record<string, string> = {};
        for (const item of (d.items ?? [])) statuses[item.id] = item.status;
        setFeedbackStatus(statuses);
      })
      .finally(() => setLoading(false));
  }

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    setReplyText("");
    setTimeout(() => replyRef.current?.focus(), 100);
  }

  async function sendReply(item: InboxItem) {
    if (!replyText.trim()) return;
    setSendingId(item.id);
    try {
      const res = await fetch(`/api/messages/${item.id}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      if (!res.ok) {
        const b = await res.json();
        alert(b.error?.message ?? "Chyba při odesílání");
        return;
      }
      const { id: replyId } = await res.json();
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "replied" as const,
                replies: [
                  ...(i.replies ?? []),
                  { id: replyId, body: replyText.trim(), fromUserId: "", isFromCommittee: true, createdAt: new Date().toISOString() },
                ],
              }
            : i,
        ),
      );
      setFeedbackStatus((prev) => ({ ...prev, [item.id]: "replied" }));
      setReplyText("");
    } finally {
      setSendingId(null);
    }
  }

  async function updateFeedbackStatus(id: string, status: string) {
    await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setFeedbackStatus((prev) => ({ ...prev, [id]: status }));
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  }

  const unread = items.filter((i) => i.kind === "message" && i.status === "new").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Komunikace</h1>
          {unread > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unread} nové
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {["all", "messages", "feedback", "ideas"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "Vše" : f === "messages" ? "Zprávy" : f === "feedback" ? "Zpětná vazba" : "Nápady"}
            </button>
          ))}
          <button onClick={load} className="px-3 py-1.5 rounded text-sm bg-gray-100 hover:bg-gray-200">
            Obnovit
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Načítám…</p>}
      {!loading && items.length === 0 && (
        <p className="text-gray-400 text-sm">Žádné zprávy.</p>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const expanded = expandedId === item.id;
          const isAnon = item.meta?.isAnonymous;
          const name = formatName(item.user, isAnon);
          const currentStatus = feedbackStatus[item.id] ?? item.status;

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-xl overflow-hidden transition-shadow ${
                expanded ? "shadow-md border-gray-300" : "border-gray-200 hover:shadow-sm"
              }`}
            >
              {/* Header row */}
              <button
                className="w-full text-left px-4 py-3 flex items-start gap-3"
                onClick={() => toggle(item.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 items-center mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KIND_COLOR[item.kind]}`}>
                      {KIND_LABEL[item.kind]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[currentStatus] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[currentStatus] ?? currentStatus}
                    </span>
                    {item.meta?.type && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {FEEDBACK_TYPE[item.meta.type as string] ?? item.meta.type}
                      </span>
                    )}
                    {item.meta?.categories && (item.meta.categories as string[]).length > 0 && (
                      <span className="text-xs text-gray-400">
                        {(item.meta.categories as string[]).join(", ")}
                      </span>
                    )}
                    {item.meta?.votes !== undefined && (
                      <span className="text-xs text-gray-400">▲ {item.meta.votes as number} hlasů</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 truncate">
                    <span className="font-medium text-gray-600">{name}: </span>
                    {item.kind === "idea" ? (item.meta?.title as string) : item.body}
                  </p>
                </div>
                <div className="text-right shrink-0 text-xs text-gray-400 space-y-0.5">
                  <p>{new Date(item.createdAt).toLocaleDateString("cs-CZ")}</p>
                  <p>{new Date(item.createdAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</p>
                  {item.replies && item.replies.length > 0 && (
                    <p className="text-blue-500">{item.replies.length} odpověď</p>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
                  {/* Original message */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">{name}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.body}</p>
                  </div>

                  {/* Thread replies */}
                  {item.replies && item.replies.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                      {item.replies.map((r) => (
                        <div
                          key={r.id}
                          className={`rounded-lg p-3 border ${
                            r.isFromCommittee
                              ? "bg-blue-50 border-blue-200 ml-4"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {r.isFromCommittee ? "Výbor" : name}
                            <span className="ml-2 text-gray-400 font-normal">
                              {new Date(r.createdAt).toLocaleString("cs-CZ", { hour12: false })}
                            </span>
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feedback status control */}
                  {item.kind === "feedback" && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-gray-500">Stav:</span>
                      {(["submitted", "in_review", "resolved", "archived"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateFeedbackStatus(item.id, s)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            currentStatus === s
                              ? "bg-gray-800 text-white border-gray-800"
                              : "bg-white border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reply box — only for direct messages */}
                  {item.kind === "message" && (
                    <div className="space-y-2">
                      <textarea
                        ref={expandedId === item.id ? replyRef : undefined}
                        rows={3}
                        placeholder="Napište odpověď…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(item);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendReply(item)}
                          disabled={!replyText.trim() || sendingId === item.id}
                          className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                        >
                          {sendingId === item.id ? "Odesílám…" : "Odeslat odpověď"}
                        </button>
                        <span className="text-xs text-gray-400">Ctrl+Enter</span>
                      </div>
                    </div>
                  )}

                  {/* Idea link */}
                  {item.kind === "idea" && (
                    <a
                      href={`/dashboard/ideas/${item.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Zobrazit nápad →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
