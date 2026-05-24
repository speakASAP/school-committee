"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email") ?? "";
  const accountDeleted = searchParams.get("deleted") === "1";

  // Magic link state
  const [email, setEmail] = useState(emailParam);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Password form state
  const [showPassword, setShowPassword] = useState(false);
  const [passwordEmail, setPasswordEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
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
      setSent(true);
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: passwordEmail, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPasswordError(body.error?.message ?? "Neplatné přihlašovací údaje");
        return;
      }
      const onboardingStatus = body.onboardingStatus ?? "incomplete";
      router.push(onboardingStatus === "complete" ? "/dashboard" : "/onboarding/profile");
    } catch {
      setPasswordError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-4 text-center">
          <div className="text-4xl">📧</div>
          <h1 className="text-xl font-bold text-gray-900">Zkontrolujte svůj email</h1>
          <p className="text-base font-semibold text-gray-900">
            Otevřete svůj email a klikněte na odkaz, který jsme vám právě poslali.
          </p>
          <p className="text-sm text-gray-500">
            Odkaz byl odeslán na adresu{" "}
            <span className="font-semibold text-gray-900">{email}</span>.
            Pokud e-mail nedorazí do pár minut, zkontrolujte složku se spamem.
          </p>
          <a
            href="/"
            className="text-sm text-blue-600 hover:underline"
          >
            Zpět na hlavní stránku
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-6">
        {accountDeleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            Váš účet byl trvale smazán. Všechna vaše osobní data byla odstraněna.
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Přihlášení</h1>
          <p className="text-sm text-gray-500 mt-1">Platforma školního výboru</p>
        </div>

        {/* Primary: magic link */}
        <form onSubmit={handleMagicLink} className="space-y-4">
          <p className="text-sm text-gray-600">
            Zadejte svůj e-mail a zašleme vám jednorázový přihlašovací odkaz.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="w-full border rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
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
        </form>

        {/* Secondary: password login */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
          >
            {showPassword ? "Skrýt přihlášení heslem" : "Přihlásit se heslem"}
          </button>

          {showPassword && (
            <form onSubmit={handlePasswordLogin} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-mail</label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={passwordEmail}
                  onChange={(e) => setPasswordEmail(e.target.value)}
                  placeholder="vas@email.cz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Heslo</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-gray-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {passwordLoading ? "Přihlašuji…" : "Přihlásit se heslem"}
              </button>
            </form>
          )}
        </div>
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
