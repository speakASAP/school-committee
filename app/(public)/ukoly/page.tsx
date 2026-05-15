import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Dobrovolnictví – Školní výbor" };

const TASKS = [
  {
    slug: "malovani",
    icon: "🎨",
    title: "Malování třídy",
    desc: "Pomoc s renovací a výmalbou prostor školy. Hledáme rodiče s citem pro barvy a ochotou pracovat o víkendu.",
    duration: "1–2 dny",
    when: "Jarní prázdniny",
    spots: 4,
  },
  {
    slug: "opravy",
    icon: "🔧",
    title: "Drobné opravy",
    desc: "Oprava nábytku, dveří, drobné elektro práce. Ideální pro šikovné ruce.",
    duration: "Průběžně",
    when: "Dle dohody",
    spots: 3,
  },
  {
    slug: "akce",
    icon: "🎉",
    title: "Organizace akcí",
    desc: "Příprava školních slavností, výletů a soutěží. Koordinace s učiteli a vedením školy.",
    duration: "3–5 hodin / akce",
    when: "Dle programu",
    spots: 6,
  },
  {
    slug: "doucovani",
    icon: "📚",
    title: "Doučování",
    desc: "Pomoc žákům s látkou ve vašem oboru. Matematika, čeština, angličtina nebo přírodní vědy.",
    duration: "1–2 hod / týden",
    when: "Školní rok",
    spots: 5,
  },
  {
    slug: "zahradnictvi",
    icon: "🌳",
    title: "Zahradničení",
    desc: "Úprava školní zahrady, výsadba záhonů a péče o zeleň kolem budovy.",
    duration: "1 den",
    when: "Jaro / podzim",
    spots: 8,
  },
  {
    slug: "odvoz",
    icon: "🚗",
    title: "Odvoz na akce",
    desc: "Přeprava dětí na soutěže a výlety vlastním vozidlem. Nutný platný řidičský průkaz.",
    duration: "Dle akce",
    when: "Dle programu",
    spots: 10,
  },
];

export default function UkolyPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <SiteHeader />

      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🕐</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Dobrovolnictví pro školu
          </h1>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
            Nemůžete přispět finančně? Nevadí. Pomozte škole svým časem a schopnostmi. Každá pomoc má velkou hodnotu.
          </p>
          <a href="/login" className="bg-blue-600 text-white font-semibold rounded-xl px-8 py-3 text-base hover:bg-blue-700 transition-colors shadow">
            Přihlásit se a přihlásit k úkolu →
          </a>
        </div>
      </section>

      <section className="px-4 py-14 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3">Dostupné úkoly</h2>
          <p className="text-gray-500 text-center mb-10">
            Přihlaste se, abyste se mohli přihlásit k úkolu a viděli, kdo již pomáhá.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TASKS.map((task) => (
              <div
                key={task.slug}
                id={task.slug}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-3 scroll-mt-20"
              >
                <div className="text-3xl">{task.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg">{task.title}</h3>
                <p className="text-sm text-gray-500 flex-1">{task.desc}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-blue-50 text-blue-700 rounded-full px-3 py-1">⏱ {task.duration}</span>
                  <span className="bg-gray-50 text-gray-600 rounded-full px-3 py-1">📅 {task.when}</span>
                  <span className="bg-green-50 text-green-700 rounded-full px-3 py-1">👥 {task.spots} míst</span>
                </div>
                <a
                  href="/login"
                  className="mt-2 block text-center bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors"
                >
                  Přihlásit se k úkolu
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 bg-gray-50 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Chcete raději přispět finančně?</h2>
          <p className="text-gray-500 text-sm mb-6">Příspěvek 500 Kč ročně pomáhá stejně jako váš čas.</p>
          <a href="/prispevky" className="inline-block bg-blue-600 text-white font-semibold rounded-xl px-8 py-3 text-base hover:bg-blue-700 transition-colors shadow">
            Zaplatit QR příspěvek →
          </a>
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
