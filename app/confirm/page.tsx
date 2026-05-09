import { redirect } from "next/navigation";

const LEADS_SERVICE_URL =
  process.env.LEADS_SERVICE_URL ?? "https://leads.alfares.cz";

async function confirmToken(token: string): Promise<"ok" | "invalid" | "error"> {
  try {
    const res = await fetch(
      `${LEADS_SERVICE_URL}/api/leads/confirm/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (res.ok) return "ok";
    if (res.status === 404) return "invalid";
    return "error";
  } catch {
    return "error";
  }
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) redirect("/");

  const result = await confirmToken(token);

  const isOk = result === "ok";
  const isInvalid = result === "invalid";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {isOk && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
              Registrace potvrzena!
            </h1>
            <p className="text-gray-600 mb-6">
              Děkujeme za potvrzení. Brzy se vám ozveme a pomůžeme s dalšími
              kroky.
            </p>
            <a
              href="/"
              className="inline-block bg-blue-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors"
            >
              Zpět na úvodní stránku
            </a>
          </>
        )}
        {isInvalid && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
              Neplatný odkaz
            </h1>
            <p className="text-gray-600 mb-6">
              Tento potvrzovací odkaz není platný nebo již byl použit.
            </p>
            <a
              href="/"
              className="inline-block bg-blue-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors"
            >
              Zpět na úvodní stránku
            </a>
          </>
        )}
        {!isOk && !isInvalid && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
              Něco se pokazilo
            </h1>
            <p className="text-gray-600 mb-6">
              Nepodařilo se zpracovat váš požadavek. Zkuste to prosím znovu
              nebo nás kontaktujte.
            </p>
            <a
              href="/"
              className="inline-block bg-blue-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors"
            >
              Zpět na úvodní stránku
            </a>
          </>
        )}
      </div>
    </div>
  );
}
