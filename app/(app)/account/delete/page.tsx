"use client";
import { useState } from "react";

export default function DeleteAccountPage() {
  const [tenantId, setTenantId] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId, reason: reason || undefined }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Request failed");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <p className="text-2xl">Request received</p>
        <p className="text-gray-600">
          Your account deletion request has been submitted. An administrator will
          process it within 30 days in accordance with GDPR Article 17.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold text-red-700">Request Account Deletion</h1>
      <p className="text-sm text-gray-600">
        Under GDPR Article 17, you have the right to request deletion of your personal data.
        Your request will be reviewed and processed within 30 days.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">School / Tenant ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason (optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you requesting deletion?"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={loading || !tenantId}
          className="w-full bg-red-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Request Account Deletion"}
        </button>
      </div>
    </div>
  );
}
