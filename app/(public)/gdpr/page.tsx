import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "GDPR – Školní výbor" };

const SECTIONS = [
  {
    icon: "📋",
    title: "Jaká data sbíráme?",
    body: "Shromažďujeme pouze data nezbytná pro provoz platformy: jméno, e-mail, telefon (volitelně), jazyk a způsob zapojení. Neukládáme rodná čísla, přesná data narození ani citlivé informace o dětech.",
  },
  {
    icon: "⚖️",
    title: "Na jakém základě?",
    body: "Zpracování probíhá na základě souhlasu (registrace, komunikace) a oprávněného zájmu (provoz spolku, účetnictví). Souhlas můžete kdykoli odvolat.",
  },
  {
    icon: "🔒",
    title: "Jak data chráníme?",
    body: "Data jsou uložena na šifrovaných serverech v EU. Přístup mají pouze oprávnění členové výboru. Platební data nejsou ukládána — zpracovává je banka přímo.",
  },
  {
    icon: "📤",
    title: "Komu data předáváme?",
    body: "Data neprodáváme ani nepůjčujeme třetím stranám. Sdílíme je pouze se zpracovateli nezbytných služeb (hosting, e-mail) na základě smluvního ujednání.",
  },
  {
    icon: "🗑️",
    title: "Jak smazat svá data?",
    body: "Kdykoli si můžete podat žádost o smazání účtu přes nastavení v aplikaci. Data vymažeme nebo anonymizujeme do 30 dnů.",
  },
  {
    icon: "📅",
    title: "Jak dlouho data uchováváme?",
    body: "Profil: do ukončení členství. Platební záznamy: dle účetních předpisů. Zpětná vazba: 12–24 měsíců. Audit logy: 24–60 měsíců.",
  },
  {
    icon: "✋",
    title: "Vaše práva",
    body: "Máte právo na přístup, opravu, výmaz, omezení zpracování a přenositelnost svých dat. Při pochybnostech se obraťte na výbor nebo na Úřad pro ochranu osobních údajů (uoou.cz).",
  },
  {
    icon: "👶",
    title: "Data o dětech",
    body: "Neukládáme jméno, přesné datum narození ani fotografie dětí bez samostatného souhlasu. Vedeme pouze přiřazení ke třídě a volitelný identifikátor.",
  },
];

export default function GdprPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <SiteHeader />

      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Ochrana osobních údajů (GDPR)
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Zpracováváme jen data, která skutečně potřebujeme. Vaše soukromí bereme vážně.
          </p>
        </div>
      </section>

      <section className="px-4 py-14 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6">
            {SECTIONS.map((s) => (
              <div key={s.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 bg-gray-50 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-bold mb-3">Kontakt správce dat</h2>
          <p className="text-gray-500 text-sm">
            Školní výbor ZŠ Střílky · school-committee.alfares.cz<br />
            Pro žádosti o přístup nebo výmaz dat se přihlaste do aplikace nebo nás kontaktujte e-mailem.
          </p>
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
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Školní výbor · school-committee.alfares.cz</p>
        </div>
      </footer>
    </div>
  );
}
