import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "QR příspěvky – Školní výbor" };

export default function PrispevkyPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white text-gray-900">
      <SiteHeader />

      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">💳</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            QR příspěvky školnímu výboru
          </h1>
          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
            Přispějte 500 Kč ročně na chod školního výboru. Platba přes QR kód — žádné karty, žádné složité formuláře.
          </p>
          <a
            href="/login"
            className="bg-blue-600 text-white font-semibold rounded-xl px-8 py-3 text-base hover:bg-blue-700 transition-colors shadow"
          >
            Přihlásit se a zaplatit →
          </a>
        </div>
      </section>

      <section className="px-4 py-14 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Proč přispívat?</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: "🏫", title: "Podpora školy", desc: "Příspěvky financují pomůcky, akce a vybavení pro vaše děti." },
              { icon: "📊", title: "Plná transparentnost", desc: "Každá koruna je zveřejněna ve zprávě o hospodaření." },
              { icon: "⚡", title: "Jednoduché a rychlé", desc: "Naskenujte QR kód v bankovní aplikaci. Hotovo za 30 sekund." },
            ].map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Výše příspěvku</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 inline-block min-w-[280px]">
            <p className="text-5xl font-extrabold text-blue-600 mb-2">500 Kč</p>
            <p className="text-gray-500 text-sm">za rok / za rodinu</p>
          </div>
          <p className="text-gray-500 text-sm mt-6 max-w-md mx-auto">
            Příspěvek je dobrovolný. Pokud nemůžete přispět finančně, můžete pomoci svým{" "}
            <a href="/ukoly" className="text-blue-600 underline hover:text-blue-800">časem a dobrovolnictvím</a>.
          </p>
        </div>
      </section>

      <section className="px-4 py-14 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Jak zaplatit</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: "1", title: "Přihlaste se", desc: "Použijte svůj e-mail nebo odkaz zaslaný výborem." },
              { n: "2", title: "Vygenerujte QR kód", desc: "Systém vytvoří personalizovaný QR kód na 500 Kč s vaším variabilním symbolem." },
              { n: "3", title: "Naskenujte v aplikaci", desc: "Otevřete bankovní aplikaci (George, Smart Banka apod.) a naskenujte kód." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">{n}</div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/login" className="bg-blue-600 text-white font-semibold rounded-xl px-8 py-3 text-base hover:bg-blue-700 transition-colors shadow">
              Přihlásit se a zaplatit →
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
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Školní výbor · school-committee.alfares.cz</p>
        </div>
      </footer>
    </div>
  );
}
