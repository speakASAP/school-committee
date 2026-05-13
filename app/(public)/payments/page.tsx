"use client";
import { useState, useEffect, Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";

interface QrResult {
  paymentIntentId: string;
  variableSymbol: string;
  amountCzk: number;
  qrString: string;
  expiresAt: string;
}

function QrGenerator() {
  const [result, setResult] = useState<QrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generateQr() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/payments/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCzk: 500 }),
      });
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = "/login?next=/payments";
        return;
      }
      if (!res.ok) { setError(body.error?.message ?? "Nepodařilo se vygenerovat QR kód"); return; }
      setResult(body);
      setGenerated(true);
    } catch {
      setError("Chyba sítě");
    } finally {
      setLoading(false);
    }
  }

  const qrImageUrl = result
    ? `/api/payments/qr-image?q=${encodeURIComponent(result.qrString)}`
    : null;

  if (!generated) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-600 text-sm">
          Kliknutím vygenerujete QR kód pro platbu 500 Kč. Platbu proveďte bankovní aplikací.
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={generateQr}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-3 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Generuji…" : "Vygenerovat QR kód pro 500 Kč"}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      {qrImageUrl && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrImageUrl} alt="QR platba" width={240} height={240} className="rounded-xl shadow-sm border border-gray-100" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm text-gray-600">
          Variabilní symbol: <strong className="font-mono text-gray-900">{result?.variableSymbol}</strong>
        </p>
        <p className="text-sm text-gray-600">
          Částka: <strong className="text-gray-900">500 Kč</strong>
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Naskenujte bankovní aplikací (George, Smart Banka apod.)
        </p>
        {result && (
          <p className="text-xs text-gray-400">
            Platí do: {new Date(result.expiresAt).toLocaleDateString("cs-CZ")}
          </p>
        )}
      </div>
    </div>
  );
}

function AuthGate() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.user))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <p className="text-sm text-gray-400 text-center">Načítám…</p>;

  if (!authed) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-600 text-sm">Pro vygenerování platebního QR kódu se prosím přihlaste.</p>
        <a
          href="/login?next=/payments"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-3 text-sm font-semibold transition-colors"
        >
          Přihlásit se a zaplatit →
        </a>
      </div>
    );
  }

  return <QrGenerator />;
}

function PaymentsContent() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <SiteHeader />
      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">💳</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Finanční příspěvek
          </h1>
          <p className="text-gray-600 text-lg mb-6 max-w-xl mx-auto">
            Roční příspěvek 500 Kč pomáhá škole zajišťovat lepší vzdělání a zázemí pro vaše děti.
          </p>
          <div className="inline-block bg-white border border-gray-200 rounded-2xl px-8 py-4 shadow-sm">
            <p className="text-4xl font-extrabold text-blue-700">500 Kč</p>
            <p className="text-sm text-gray-500 mt-1">za školní rok</p>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="px-4 py-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Proč přispívat?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🏫", title: "Lepší vybavení", desc: "Příspěvky jdou přímo na pomůcky, knihy a vybavení tříd." },
              { icon: "📊", title: "Transparentní", desc: "Každou korunu zveřejňujeme ve výroční zprávě. Víte, za co platíte." },
              { icon: "⚡", title: "Rychlé a jednoduché", desc: "Platba přes QR kód — žádné formuláře, žádné složitosti." },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-2">
                <div className="text-3xl">{c.icon}</div>
                <p className="font-semibold text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHERE DOES MONEY GO */}
      <section className="px-4 py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Kam peníze jdou?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "📚", title: "Učební pomůcky", pct: "40 %", desc: "Knihy, sešity, výtvarné potřeby a laboratorní vybavení." },
              { icon: "🖥️", title: "Digitální technika", pct: "25 %", desc: "Tablety, projektory a software pro moderní výuku." },
              { icon: "🏃", title: "Volnočasové aktivity", pct: "20 %", desc: "Kroužky, výlety a sportovní akce pro žáky." },
              { icon: "🌱", title: "Rezerva a opravy", pct: "15 %", desc: "Nečekané opravy a fond pro příští rok." },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4 items-start">
                <div className="text-3xl shrink-0">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{c.title}</p>
                    <span className="text-blue-700 font-bold text-sm shrink-0">{c.pct}</span>
                  </div>
                  <p className="text-sm text-gray-500">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO PAY */}
      <section className="px-4 py-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Jak zaplatit?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Přihlaste se", desc: "Přihlaste se svým rodičovským účtem." },
              { step: "2", title: "Vygenerujte QR", desc: "Klikněte na tlačítko níže — QR kód se vygeneruje automaticky na 500 Kč." },
              { step: "3", title: "Zaplaťte", desc: "Naskenujte QR kód v bankovní aplikaci a potvrďte platbu." },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{s.step}</div>
                <p className="font-semibold text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR SECTION */}
      <section className="px-4 py-12 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Zaplatit 500 Kč</h2>
            <Suspense fallback={<p className="text-sm text-gray-400 text-center">Načítám…</p>}>
              <AuthGate />
            </Suspense>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 px-4 py-8 bg-white">
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
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Školní výbor · school-committee.alfares.cz</p>
        </div>
      </footer>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsContent />
    </Suspense>
  );
}
