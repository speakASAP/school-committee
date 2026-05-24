"use client";
import { useState, useEffect, Suspense } from "react";

interface QrResult {
  paymentIntentId: string;
  variableSymbol: string;
  amountCzk: number;
  qrString: string;
  expiresAt: string;
}

interface PaymentStatus {
  paid: boolean;
  schoolYear: string;
  semester?: string;
  paidAt?: string;
  amountCzk?: number;
  paidByFamily?: boolean;
}

function PaidBanner({ status }: { status: PaymentStatus }) {
  const period = status.semester
    ? `${status.schoolYear} ${status.semester}`
    : status.schoolYear;

  return (
    <div className="text-center space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-2">
        <div className="text-4xl">✅</div>
        <p className="font-bold text-green-800 text-lg">
          {status.paidByFamily ? "Příspěvek zaplacen rodinou" : "Příspěvek zaplacen"}
        </p>
        <p className="text-green-700 text-sm">
          {period} — {status.amountCzk ?? 500} Kč
        </p>
        {status.paidByFamily && (
          <p className="text-green-600 text-sm">
            Platbu provedl jiný člen vaší rodiny. Nic dalšího není potřeba.
          </p>
        )}
        {status.paidAt && (
          <p className="text-green-600 text-xs">
            Potvrzeno {new Date(status.paidAt).toLocaleDateString("cs-CZ")}
          </p>
        )}
      </div>
      <p className="text-xs text-gray-400">
        Děkujeme za váš příspěvek školnímu výboru.
      </p>
    </div>
  );
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

function AuthGate({ authed, paymentStatus }: { authed: boolean | null; paymentStatus: PaymentStatus | null }) {
  if (authed === null) return <p className="text-sm text-gray-400 text-center">Načítám…</p>;

  if (!authed) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-600 text-sm">Pro vygenerování platebního QR kódu se prosím přihlaste.</p>
        <a
          href="/login?next=/payments"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-3 text-sm font-semibold transition-colors"
        >
          Přihlásit se →
        </a>
      </div>
    );
  }

  if (paymentStatus?.paid) {
    return <PaidBanner status={paymentStatus} />;
  }

  return <QrGenerator />;
}

function PaymentsContent() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAuthed(!!d?.user))
      .catch(() => setAuthed(false));

    fetch("/api/payments/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPaymentStatus(d); })
      .catch(() => null);
  }, []);

  return (
    <div className="font-sans text-gray-900">
      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <a href="#pay" className="text-5xl mb-4 inline-block hover:scale-110 transition-transform cursor-pointer">💳</a>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Finanční příspěvek
          </h1>
          <p className="text-gray-600 text-lg mb-6 max-w-xl mx-auto">
            Příspěvek 500 Kč za pololetí pomáhá škole zajišťovat lepší vzdělání a zázemí pro vaše děti.
          </p>
          <a href="#pay" className="inline-block bg-white border border-gray-200 rounded-2xl px-8 py-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <p className="text-4xl font-extrabold text-blue-700">500 Kč</p>
            <p className="text-sm text-gray-500 mt-1">za pololetí</p>
          </a>
        </div>
      </section>

      {/* WHY */}
      <section className="px-4 py-12 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Proč přispívat?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🏫", title: "Lepší vybavení", desc: "Příspěvky jdou přímo na pomůcky, knihy a vybavení tříd.", href: "/report" },
              { icon: "📊", title: "Transparentní", desc: "Každou korunu zveřejňujeme ve výroční zprávě. Víte, za co platíte.", href: "/report" },
              { icon: "⚡", title: "Rychlé a jednoduché", desc: "Platba přes QR kód — žádné formuláře, žádné složitosti.", href: "#pay" },
            ].map((c) => (
              <a key={c.title} href={c.href} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-2 hover:shadow-md hover:border-blue-200 transition-all">
                <div className="text-3xl">{c.icon}</div>
                <p className="font-semibold text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500">{c.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* WHERE DOES MONEY GO */}
      <section className="px-4 py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Kam peníze jdou?</h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            Každá koruna zůstává ve škole a slouží přímo dětem. Výdaje zveřejňujeme ve{" "}
            <a href="/report" className="text-blue-600 underline">výroční zprávě</a>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "🚌", title: "Výlety a exkurze", desc: "Školy v přírodě, divadelní představení, muzea a vzdělávací výjezdy pro děti." },
              { icon: "🎨", title: "Aktivity a kroužky", desc: "Příspěvky na kroužky, sportovní turnaje a mimoškolní programy." },
              { icon: "📚", title: "Učebnice a pomůcky", desc: "Doplňkové učebnice, pracovní listy, výtvarné a laboratorní potřeby." },
              { icon: "🧻", title: "Hygienické potřeby", desc: "Toaletní papír, mýdlo a další základní potřeby, které škola nemůže pokrýt sama." },
              { icon: "🏫", title: "Provozní náklady", desc: "Drobné opravy, vybavení tříd a věci, na které státní rozpočet nestačí." },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4 items-start">
                <div className="text-3xl shrink-0">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 mb-1">{c.title}</p>
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
            {(authed
              ? [
                  { step: "1", title: "Vygenerujte QR", desc: "Klikněte na tlačítko níže — QR kód se vygeneruje automaticky na 500 Kč.", href: "#pay" },
                  { step: "2", title: "Zaplaťte", desc: "Naskenujte QR kód v bankovní aplikaci a potvrďte platbu.", href: "#pay" },
                ]
              : [
                  { step: "1", title: "Přihlaste se", desc: "Přihlaste se svým rodičovským účtem.", href: "/login?next=/payments" },
                  { step: "2", title: "Vygenerujte QR", desc: "Klikněte na tlačítko níže — QR kód se vygeneruje automaticky na 500 Kč.", href: "#pay" },
                  { step: "3", title: "Zaplaťte", desc: "Naskenujte QR kód v bankovní aplikaci a potvrďte platbu.", href: "#pay" },
                ]
            ).map((s) => (
              <a key={s.step} href={s.href} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-2 hover:shadow-md hover:border-blue-200 transition-all">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{s.step}</div>
                <p className="font-semibold text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* QR SECTION */}
      <section id="pay" className="px-4 py-12 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Zaplatit 500 Kč</h2>
            <Suspense fallback={<p className="text-sm text-gray-400 text-center">Načítám…</p>}>
              <AuthGate authed={authed} paymentStatus={paymentStatus} />
            </Suspense>
          </div>
        </div>
      </section>

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
