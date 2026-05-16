"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder";

const TYPES = ["suggestion", "complaint", "praise", "question"] as const;

const CATEGORY_LABEL: Record<string, string> = {
  bezpecnost: "Bezpečnost",
  vybaveni: "Vybavení",
  ucitele: "Učitelé",
  akce: "Akce",
  finance: "Finance",
  komunikace: "Komunikace",
  administrativa: "Administrativa",
  jidelna: "Jídelna",
  sport: "Sport",
  kultura: "Kultura",
  prostory: "Prostory",
  obecne: "Obecné",
};

const TYPE_LABEL: Record<string, string> = {
  suggestion: "Návrh",
  complaint: "Stížnost",
  praise: "Pochvala",
  question: "Dotaz",
};

interface SubmittedItem {
  id: string;
  categories: string[];
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

const STATUS_LABEL: Record<string, string> = {
  new: "nové",
  in_review: "v řešení",
  resolved: "vyřešeno",
  rejected: "zamítnuto",
};

function VoiceButton({ onFileKey }: { onFileKey: (key: string | null) => void }) {
  const { state, seconds, errorMsg, fileKey, start, stop, clear } = useVoiceRecorder();

  useEffect(() => { onFileKey(fileKey); }, [fileKey, onFileKey]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (state === "idle") {
    return (
      <button type="button" onClick={start}
        className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors">
        <span className="text-red-500">●</span> Nahrát hlasovou zprávu
      </button>
    );
  }
  if (state === "recording") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-red-600 animate-pulse">● Nahrávám {fmt(seconds)}</span>
        <button type="button" onClick={stop}
          className="border border-gray-200 rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
          Zastavit
        </button>
      </div>
    );
  }
  if (state === "uploading") {
    return <p className="text-sm text-gray-400">Nahrávám…</p>;
  }
  if (state === "done") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-green-700">✓ Hlasová zpráva připravena ({fmt(seconds)})</span>
        <button type="button" onClick={() => { clear(); onFileKey(null); }}
          className="text-xs text-gray-400 hover:text-gray-700 underline">
          Odebrat
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
          Zkusit znovu
        </button>
      </div>
    );
  }
  return null;
}

function SubmitForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState({
    type: "suggestion" as typeof TYPES[number],
    text: "",
    isAnonymous: false,
  });
  const [voiceFileKey, setVoiceFileKey] = useState<string | null>(null);
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
          type: form.type,
          text: form.text,
          isAnonymous: form.isAnonymous,
          voiceFileKey: voiceFileKey ?? undefined,
        }),
      });
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = "/login?next=/feedback";
        return;
      }
      if (!res.ok) { setError(body.error?.message ?? "Odeslání selhalo"); return; }
      onSubmitted();
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vaše zpráva</label>
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          placeholder="Napište svou zprávu nebo nahrajte hlasovou zprávu níže…"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hlasová zpráva (volitelně)</label>
        <VoiceButton onFileKey={setVoiceFileKey} />
        {voiceFileKey && (
          <p className="text-xs text-gray-400 mt-1">Hlas bude po odeslání automaticky přepsán.</p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
        <input type="checkbox" checked={form.isAnonymous}
          onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
        Odeslat anonymně
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <p className="text-xs text-gray-400">Pro odeslání zpětné vazby je nutné přihlášení.</p>
      <button
        type="submit"
        disabled={submitting || (!form.text.trim() && !voiceFileKey)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {submitting ? "Odesílám…" : "Odeslat zpětnou vazbu"}
      </button>
    </form>
  );
}

function HistoryList({ refresh, activeCategory }: { refresh: number; activeCategory: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<SubmittedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = new URL("/api/feedback", window.location.origin);
    url.searchParams.set("limit", "20");
    if (activeCategory) url.searchParams.set("category", activeCategory);
    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error.message);
        else setItems(d.items ?? []);
      })
      .catch(() => setError("Chyba sítě"))
      .finally(() => setLoading(false));
  }, [refresh, activeCategory]);

  function handleCategoryClick(slug: string) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("category") === slug) {
      params.delete("category");
    } else {
      params.set("category", slug);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  if (loading) return <p className="text-sm text-gray-400">Načítám…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (items.length === 0) return (
    <p className="text-sm text-gray-400">
      {activeCategory ? `Žádná podání v kategorii „${CATEGORY_LABEL[activeCategory] ?? activeCategory}".` : "Zatím žádná podání."}
    </p>
  );

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 flex-wrap">
              {item.categories.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => handleCategoryClick(slug)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                    activeCategory === slug
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {CATEGORY_LABEL[slug] ?? slug}
                </button>
              ))}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {TYPE_LABEL[item.type] ?? item.type}
              </span>
              {item.isAnonymous && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">anonymní</span>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[item.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>
          <p className="text-sm text-gray-700">{item.text}</p>
          {item.voiceTranscript && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-600 mb-1">Přepis hlasu</p>
              <p className="text-sm text-blue-900">{item.voiceTranscript}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString("cs-CZ", { hour12: false })}</p>
        </li>
      ))}
    </ul>
  );
}

function FeedbackContent() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const [tab, setTab] = useState<"new" | "history">("new");
  const [refreshKey, setRefreshKey] = useState(0);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const handleSubmitted = useCallback(() => {
    setJustSubmitted(true);
    setRefreshKey((k) => k + 1);
    setTab("history");
    setTimeout(() => setJustSubmitted(false), 4000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Zpětná vazba
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Podejte návrhy, dotazy, pochvaly nebo stížnosti. Váš hlas pomáhá škole být lepší.
          </p>
        </div>
      </section>

      {/* INFO CARDS */}
      <section className="px-4 py-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              { icon: "📝", title: "Návrhy a dotazy", desc: "Navrhněte zlepšení nebo se zeptejte na cokoliv." },
              { icon: "🔒", title: "Anonymní podání", desc: "Zprávu lze odeslat anonymně — vaše identita zůstane skryta." },
              { icon: "📣", title: "Rychlá odezva", desc: "Výbor odpovídá zpravidla do 5 pracovních dnů." },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-2">
                <div className="text-3xl">{c.icon}</div>
                <p className="font-semibold text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* FORM */}
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {(["new", "history"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      tab === t
                        ? "border-blue-600 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-blue-700 hover:bg-blue-50"
                    }`}>
                    {t === "new" ? "Nové podání" : "Moje podání"}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {justSubmitted && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                    Děkujeme — vaše zpětná vazba byla odeslána.
                  </div>
                )}
                {tab === "new" && <SubmitForm onSubmitted={handleSubmitted} />}
                {tab === "history" && <HistoryList refresh={refreshKey} activeCategory={activeCategory} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 px-4 py-8 bg-white mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "QR příspěvky", href: "/payments" },
              { label: "Dobrovolnictví", href: "/tasks" },
              { label: "Transparentnost", href: "/report" },
              { label: "GDPR", href: "/gdpr" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors">{l.label}</a>
            ))}
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Školní výbor · strilkove.cz</p>
        </div>
      </footer>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackContent />
    </Suspense>
  );
}
