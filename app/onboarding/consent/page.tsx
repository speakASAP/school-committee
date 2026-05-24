"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CONSENT_VERSION = "1.0";

export default function ConsentPage() {
  const router = useRouter();

  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [participation, setParticipation] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Hesla se neshodují");
      return;
    }
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Step 1: record consent
      const consentRes = await fetch("/api/onboarding/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consent: {
            version: CONSENT_VERSION,
            termsAccepted: terms,
            privacyPolicyAccepted: privacy,
            parentCommitteeParticipation: participation,
            recordedAt: new Date().toISOString(),
          },
        }),
      });
      const consentBody = await consentRes.json();
      if (!consentRes.ok) {
        setError(consentBody.error?.message ?? "Nepodařilo se zaznamenat souhlas");
        return;
      }

      // Step 2: set password
      const pwRes = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const pwBody = await pwRes.json();
      if (!pwRes.ok) {
        setError(pwBody.error?.message ?? "Nepodařilo se nastavit heslo");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = terms && privacy && participation && password.length >= 6 && confirm.length > 0;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Krok 3 ze 3</p>
        <h1 className="text-2xl font-bold text-gray-900">Souhlas a heslo</h1>
        <p className="text-sm text-gray-500 mt-1">Potvrďte souhlas a nastavte heslo pro dokončení registrace.</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue-600"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              required
            />
            <span className="text-sm">
              Souhlasím s <span className="underline text-blue-600">Podmínkami použití</span> *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue-600"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              required
            />
            <span className="text-sm">
              Souhlasím se <span className="underline text-blue-600">Zásadami ochrany osobních údajů</span> *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue-600"
              checked={participation}
              onChange={(e) => setParticipation(e.target.checked)}
              required
            />
            <span className="text-sm">
              Souhlasím s účastí v rodičovském sdružení a se zpracováním údajů s tím spojených *
            </span>
          </label>
        </div>

        <div className="border-t pt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nové heslo</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimálně 6 znaků"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Potvrdit heslo</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              className="w-full border rounded-lg px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ukládám…" : "Dokončit registraci"}
        </button>
      </form>
    </div>
  );
}
