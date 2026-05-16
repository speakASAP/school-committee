"use client";
import { useEffect, useState, useCallback } from "react";

interface IdeaItem {
  id: string;
  title: string;
  description: string;
  budgetNeededCzk: number | null;
  status: string;
  categories: string[];
  className: string | null;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
}

interface Me {
  id: string;
  email: string;
  roles: string[];
  approvalStatus?: string;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Podáno",
  under_review: "V posuzování",
  accepted: "Přijato",
  rejected: "Zamítnuto",
  implemented: "Realizováno",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  implemented: "bg-purple-100 text-purple-800",
};

export default function IdeasPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  // Submit form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budgetNeededCzk: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isApproved = me?.approvalStatus === "approved";

  const loadIdeas = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas");
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.items ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => null);
    loadIdeas();
  }, [loadIdeas]);

  async function toggleVote(idea: IdeaItem) {
    if (!isApproved || votingId) return;
    setVotingId(idea.id);
    try {
      if (idea.hasVoted) {
        await fetch(`/api/ideas/${idea.id}/vote`, { method: "DELETE" });
        setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, hasVoted: false, voteCount: i.voteCount - 1 } : i));
      } else {
        await fetch(`/api/ideas/${idea.id}/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ voteType: "support" }) });
        setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, hasVoted: true, voteCount: i.voteCount + 1 } : i));
      }
    } catch { /* ignore */ }
    setVotingId(null);
  }

  async function submitIdea() {
    if (!form.title.trim() || !form.description.trim()) {
      setSubmitError("Název a popis jsou povinné");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          budgetNeededCzk: form.budgetNeededCzk ? Number(form.budgetNeededCzk) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error?.message ?? "Odeslání selhalo");
      } else {
        setForm({ title: "", description: "", budgetNeededCzk: "" });
        setShowForm(false);
        await loadIdeas();
      }
    } catch {
      setSubmitError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nápady</h1>
          <p className="text-sm text-gray-500 mt-1">Navrhujte vylepšení a hlasujte pro nápady ostatních</p>
        </div>
        {isApproved && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            + Přidat nápad
          </button>
        )}
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">Nový nápad</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Stručný název nápadu"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Popis *</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Popište svůj nápad podrobněji…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Odhadovaný rozpočet (Kč)</label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.budgetNeededCzk}
              onChange={(e) => setForm((f) => ({ ...f, budgetNeededCzk: e.target.value }))}
              placeholder="Volitelně"
            />
          </div>
          {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
          <div className="flex gap-2">
            <button
              onClick={submitIdea}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting ? "Odesílám…" : "Odeslat nápad"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Zrušit
            </button>
          </div>
        </div>
      )}

      {!isApproved && me && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
          Nápady mohou přidávat a hlasovat pouze schválení uživatelé.
        </div>
      )}

      {/* Ideas list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-28 animate-pulse" />)}
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center text-gray-400">
          Zatím žádné nápady. Buďte první!
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4">
              {/* Vote button */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <button
                  onClick={() => toggleVote(idea)}
                  disabled={!isApproved || votingId === idea.id}
                  className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-colors border
                    ${idea.hasVoted
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600"}
                    ${!isApproved ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  title={idea.hasVoted ? "Odebrat hlas" : "Podpořit nápad"}
                >
                  <span>▲</span>
                  <span>{idea.voteCount}</span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900">{idea.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[idea.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[idea.status] ?? idea.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{idea.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {idea.className && <span>{idea.className}</span>}
                  {idea.budgetNeededCzk && <span>≈ {idea.budgetNeededCzk.toLocaleString("cs-CZ")} Kč</span>}
                  <span>{new Date(idea.createdAt).toLocaleDateString("cs-CZ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
