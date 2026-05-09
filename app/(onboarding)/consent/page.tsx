"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const CONSENT_VERSION = "1.0";

function ConsentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tenantId = searchParams.get("tenantId") ?? "";
  const schoolId = searchParams.get("schoolId") ?? "";

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
          tenantId,
          schoolId,
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
      if (!res.ok) { setError(body.error?.message ?? "Failed to record consent"); return; }
      router.replace("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">GDPR Consent</h1>
      <p className="text-sm text-gray-500 mb-6">Please read and accept all items to continue.</p>
      <form onSubmit={submit} className="space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
          <span className="text-sm">
            I accept the <span className="underline text-blue-600">Terms of Service</span> *
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} required />
          <span className="text-sm">
            I accept the <span className="underline text-blue-600">Privacy Policy</span> *
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={participation} onChange={(e) => setParticipation(e.target.checked)} required />
          <span className="text-sm">
            I consent to participate in the parent committee and allow processing of data related to this participation *
          </span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading || !terms || !privacy || !participation}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Saving…" : "Complete registration"}
        </button>
      </form>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}
