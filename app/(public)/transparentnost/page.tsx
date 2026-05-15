import { Suspense } from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Transparentnost – Školní výbor" };

interface ReportData {
  totalCollectedCzk: number;
  totalSpentCzk: number;
  balanceCzk: number;
  completedTaskCount: number;
  expenses: { id: string; title: string; category: string; amountCzk: number; spentAt: string }[];
  completedTasks?: { id: string; title: string; actorName: string | null; finishedAt: string }[];
}

async function fetchReport(): Promise<ReportData | null> {
  try {
    const base = process.env.APP_BASE_URL ?? "http://localhost:4800";
    const schoolId = process.env.DEFAULT_SCHOOL_ID ?? "";
    if (!schoolId) return null;
    const res = await fetch(`${base}/api/public/report?schoolId=${schoolId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function ReportBlock() {
  const data = await fetchReport();

  if (!data) {
    return (
      <p className="text-center text-gray-400 text-sm">
        Data momentálně nejsou dostupná. Zkuste to prosím později.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Vybráno", value: `${data.totalCollectedCzk.toLocaleString("cs-CZ")} Kč`, color: "text-green-600" },
          { label: "Vydáno", value: `${data.totalSpentCzk.toLocaleString("cs-CZ")} Kč`, color: "text-red-600" },
          { label: "Zůstatek", value: `${data.balanceCzk.toLocaleString("cs-CZ")} Kč`, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Dokončené dobrovolnické úkoly</h3>
        <p className="text-3xl font-extrabold text-blue-600">{data.completedTaskCount}</p>
      </div>

      {data.expenses.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Výdaje</h3>
          <ul className="space-y-2">
            {data.expenses.map((e) => (
              <li key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between items-center shadow-sm">
                <span>
                  <span className="font-medium text-gray-900">{e.title}</span>
                  <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{e.category}</span>
                </span>
                <span className="text-red-600 font-semibold">{e.amountCzk.toLocaleString("cs-CZ")} Kč</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.completedTasks && data.completedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Dokončené úkoly</h3>
          <ul className="space-y-2">
            {data.completedTasks.map((t) => (
              <li key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex justify-between items-center">
                <span>
                  <span className="font-medium text-gray-900 text-sm">{t.title}</span>
                  {t.actorName && (
                    <span className="ml-2 text-xs text-gray-400">👤 {t.actorName}</span>
                  )}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(t.finishedAt).toLocaleDateString("cs-CZ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TransparentnostPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <SiteHeader />

      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">📊</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Transparentní hospodaření
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Víte přesně, kolik bylo vybráno, vydáno a co za to škola získala. Žádné skryté pohyby.
          </p>
        </div>
      </section>

      <section className="px-4 py-14 bg-white">
        <div className="max-w-3xl mx-auto">
          <Suspense fallback={<p className="text-sm text-gray-400 text-center">Načítám data…</p>}>
            <ReportBlock />
          </Suspense>
        </div>
      </section>

      <section className="px-4 py-10 bg-gray-50 text-center">
        <div className="max-w-xl mx-auto">
          <p className="text-gray-500 text-sm mb-4">
            Chcete přispět? Pomůžete finančně nebo svým časem.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/prispevky" className="bg-blue-600 text-white font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-blue-700 transition-colors">
              💳 Zaplatit příspěvek
            </a>
            <a href="/ukoly" className="bg-white border border-blue-200 text-blue-700 font-semibold rounded-xl px-6 py-2.5 text-sm hover:bg-blue-50 transition-colors">
              🕐 Dobrovolničit
            </a>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-gray-100 px-4 py-8 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "QR příspěvky", href: "/prispevky" },
              { label: "Dobrovolnictví", href: "/ukoly" },
              { label: "Transparentnost", href: "/transparentnost" },
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
