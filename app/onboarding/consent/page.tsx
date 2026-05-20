"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CONSENT_VERSION = "1.0";

export default function ConsentPage() {
  const router = useRouter();

  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [participation, setParticipation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/consent", {
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
      const body = await res.json();
      if (!res.ok) { setError(body.error?.message ?? "Nepodařilo se zaznamenat souhlas"); return; }
      router.replace("/onboarding/set-password");
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Krok 3 ze 3</p>
        <h1 className="text-2xl font-bold text-gray-900">Souhlas se zpracováním údajů</h1>
        <p className="text-sm text-gray-500 mt-1">Přečtěte si a potvrďte všechny body pro dokončení registrace.</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !terms || !privacy || !participation}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ukládám…" : "Dokončit registraci"}
        </button>
      </form>
    </div>
  );
}
