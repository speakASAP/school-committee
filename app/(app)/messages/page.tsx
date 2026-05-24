"use client";
import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  body: string;
  isFromCommittee: boolean;
  createdAt: string;
  readAt: string | null;
  parentId: string | null;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enhanceWithAi, setEnhanceWithAi] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function load() {
    setLoading(true);
    fetch("/api/messages")
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setMessages(d.items ?? []))
      .finally(() => setLoading(false));
  }

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text.trim(), enhanceWithAi }),
      });
      if (!res.ok) {
        const b = await res.json();
        setError(b.error?.message ?? "Odeslání selhalo");
        return;
      }
      setText("");
      load();
    } catch {
      setError("Chyba sítě");
    } finally {
      setSending(false);
    }
  }

  // Group into threads: top-level messages + their replies interleaved
  const topLevel = messages.filter((m) => !m.parentId && !m.isFromCommittee);
  const replies = messages.filter((m) => m.parentId || m.isFromCommittee);

  // Flat thread: sort all by date
  const thread = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zprávy výboru</h1>
          <p className="text-sm text-gray-500 mt-0.5">Přímý kontakt s rodičovským výborem</p>
        </div>
      </div>

      {/* Thread */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 min-h-64 space-y-3">
        {loading && <p className="text-sm text-gray-400">Načítám…</p>}
        {!loading && thread.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            Zatím žádné zprávy. Napište nám níže.
          </p>
        )}
        {thread.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isFromCommittee ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.isFromCommittee
                  ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                  : "bg-blue-600 text-white rounded-tr-sm"
              }`}
            >
              {msg.isFromCommittee && (
                <p className="text-xs font-semibold text-gray-500 mb-1">Výbor</p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
              <p className={`text-xs mt-1 ${msg.isFromCommittee ? "text-gray-400" : "text-blue-200"}`}>
                {new Date(msg.createdAt).toLocaleString("cs-CZ", { hour12: false, hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <textarea
          rows={3}
          placeholder="Napište zprávu výboru…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
        />

        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          ℹ️ Vaše zpráva může být před odesláním upravena AI pro lepší srozumitelnost a přesvědčivost.
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enhanceWithAi}
            onChange={(e) => setEnhanceWithAi(e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm text-gray-700">Vylepšit zprávu pomocí AI</span>
        </label>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Ctrl+Enter pro odeslání</span>
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {sending ? "Odesílám…" : "Odeslat"}
          </button>
        </div>
      </div>
    </div>
  );
}
