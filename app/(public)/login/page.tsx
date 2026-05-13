"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Mode = "password" | "magic";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") ?? "/dashboard";
  const emailParam = searchParams.get("email") ?? "";

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Přihlášení selhalo");
        return;
      }
      router.replace(next);
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Nepodařilo se odeslat odkaz");
        return;
      }
      setMagicSent(true);
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-4 text-center">
          <div className="text-4xl">📧</div>
          <h1 className="text-xl font-bold text-gray-900">Odkaz odeslán</h1>
          <p className="text-sm text-gray-700">
            Odkaz byl odeslán na adresu{" "}
            <span className="font-semibold text-gray-900">{email}</span>.
          </p>
          <p className="text-sm text-gray-500">
            Zkontrolujte svou e-mailovou schránku. Pokud e-mail nedorazí do pár minut, zkontrolujte složku se spamem nebo zkuste zadat e-mail znovu.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => { setMagicSent(false); }}
              className="text-sm text-blue-600 hover:underline"
            >
              Zadat jiný e-mail
            </button>
            <button
              onClick={() => { setMagicSent(false); setMode("password"); }}
              className="text-sm text-gray-500 hover:underline"
            >
              ← Zpět na přihlášení
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Přihlášení</h1>
          <p className="text-sm text-gray-500 mt-1">Platforma školního výboru</p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "password"
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Heslo
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "magic"
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Odkaz na e-mail
          </button>
        </div>

        {mode === "password" ? (
          <form onSubmit={submitPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heslo</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Přihlašuji…" : "Přihlásit se"}
            </button>
            <p className="text-center text-sm text-gray-500">
              Zapomněli jste heslo?{" "}
              <button
                type="button"
                onClick={() => { setMode("magic"); setError(null); }}
                className="text-blue-600 hover:underline"
              >
                Přihlaste se bez hesla
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={submitMagic} className="space-y-4">
            <p className="text-sm text-gray-600">
              Zadejte svůj e-mail a zašleme vám jednorázový přihlašovací odkaz.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Odesílám…" : "Odeslat přihlašovací odkaz"}
            </button>
            <p className="text-center text-sm text-gray-500">
              Znáte heslo?{" "}
              <button
                type="button"
                onClick={() => { setMode("password"); setError(null); }}
                className="text-blue-600 hover:underline"
              >
                Přihlaste se heslem
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
