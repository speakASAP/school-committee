"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Odeslání selhalo");
        return;
      }
      // Session is cleared server-side — redirect to login with confirmation message
      router.replace("/login?deleted=1");
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-red-700 mb-2">Žádost o smazání účtu</h1>
        <p className="text-sm text-gray-600">
          Podle článku 17 GDPR máte právo na smazání svých osobních údajů.
          Po potvrzení bude váš účet a všechna data okamžitě a trvale smazána.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Důvod (volitelně)</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Proč žádáte o smazání účtu?"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Odesílám…" : "Požádat o smazání účtu"}
        </button>
      </div>
    </div>
  );
}
