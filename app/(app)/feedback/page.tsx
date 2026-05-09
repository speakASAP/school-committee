"use client";
import { useState, useEffect } from "react";
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder";

const CATEGORIES = ["general", "safety", "facilities", "teachers", "events", "other"];
const TYPES = ["suggestion", "complaint", "praise", "question"];

interface SubmittedItem {
  id: string;
  category: string;
  type: string;
  text: string;
  status: string;
  isAnonymous: boolean;
  voiceTranscript: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_review: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function VoiceButton({ onFileKey }: { onFileKey: (key: string | null) => void }) {
  const { state, seconds, errorMsg, fileKey, start, stop, clear } = useVoiceRecorder();

  useEffect(() => { onFileKey(fileKey); }, [fileKey, onFileKey]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <button type="button" onClick={start}
        className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
        <span className="text-red-500">●</span> Record voice message
      </button>
    );
  }
  if (state === "recording") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-red-600 animate-pulse">● Recording {fmt(seconds)}</span>
        <button type="button" onClick={stop}
          className="border rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
          Stop
        </button>
      </div>
    );
  }
  if (state === "uploading") {
    return <p className="text-sm text-gray-400">Uploading…</p>;
  }
  if (state === "done") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-green-700">✓ Voice message ready ({fmt(seconds)})</span>
        <button type="button" onClick={() => { clear(); onFileKey(null); }}
          className="text-xs text-gray-400 hover:text-gray-700 underline">
          Remove
        </button>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-red-600">{errorMsg}</span>
        <button type="button" onClick={() => { clear(); onFileKey(null); }}
          className="text-xs text-gray-400 hover:text-gray-700 underline">
          Try again
        </button>
      </div>
    );
  }
  return null;
}

function SubmitForm({ schoolId, onSubmitted }: { schoolId: string; onSubmitted: () => void }) {
  const [form, setForm] = useState({
    category: "general", type: "suggestion", text: "", isAnonymous: false,
  });
  const [voiceFileKey, setVoiceFileKey] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schoolId,
          ...form,
          voiceFileKey: voiceFileKey ?? undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error?.message ?? "Submission failed"); return; }
      setTranscript(body.voiceTranscript ?? null);
      onSubmitted();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Your message</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3}
          value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
          placeholder="Type your message here, or record a voice message below…" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Voice message (optional)</label>
        <VoiceButton onFileKey={setVoiceFileKey} />
        {voiceFileKey && (
          <p className="text-xs text-gray-400 mt-1">
            Voice will be transcribed automatically after submission.
          </p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.isAnonymous}
          onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
        Submit anonymously
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit"
        disabled={submitting || (!form.text.trim() && !voiceFileKey)}
        className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
        {submitting ? "Sending…" : "Submit feedback"}
      </button>
    </form>
  );
}

function HistoryList({ schoolId, refresh }: { schoolId: string; refresh: number }) {
  const [items, setItems] = useState<SubmittedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    fetch(`/api/feedback?schoolId=${encodeURIComponent(schoolId)}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error.message);
        else setItems(d.items ?? []);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [schoolId, refresh]);

  if (!schoolId) return null;
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (items.length === 0) return <p className="text-sm text-gray-400">No submissions yet.</p>;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="bg-white rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.type}</span>
              {item.isAnonymous && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">anonymous</span>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.status] ?? "bg-gray-100 text-gray-600"}`}>
              {item.status}
            </span>
          </div>
          <p className="text-sm text-gray-700">{item.text}</p>
          {item.voiceTranscript && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-600 mb-1">Voice transcript</p>
              <p className="text-sm text-blue-900">{item.voiceTranscript}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString("cs-CZ")}</p>
        </li>
      ))}
    </ul>
  );
}

export default function FeedbackPage() {
  const [schoolId, setSchoolId] = useState("");
  const [schoolIdInput, setSchoolIdInput] = useState("");
  const [tab, setTab] = useState<"new" | "history">("new");
  const [refreshKey, setRefreshKey] = useState(0);
  const [justSubmitted, setJustSubmitted] = useState(false);

  function handleSubmitted() {
    setJustSubmitted(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setJustSubmitted(false), 3000);
  }

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-bold">Feedback</h1>

      <div>
        <label className="block text-sm font-medium mb-1">School ID</label>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="uuid" value={schoolIdInput}
            onChange={(e) => setSchoolIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSchoolId(schoolIdInput)} />
          <button onClick={() => setSchoolId(schoolIdInput)}
            className="bg-gray-800 text-white rounded-lg px-4 py-2 text-sm">
            Set
          </button>
        </div>
      </div>

      {schoolId && (
        <>
          <div className="flex border-b">
            {(["new", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}>
                {t === "new" ? "New submission" : "My submissions"}
              </button>
            ))}
          </div>

          {justSubmitted && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              Thank you — your feedback has been submitted.
              {tab === "new" && (
                <button onClick={() => setTab("history")} className="ml-2 underline">
                  View it →
                </button>
              )}
            </div>
          )}

          {tab === "new" && (
            <SubmitForm schoolId={schoolId} onSubmitted={handleSubmitted} />
          )}
          {tab === "history" && (
            <HistoryList schoolId={schoolId} refresh={refreshKey} />
          )}
        </>
      )}
    </div>
  );
}
