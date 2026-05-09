"use client";
import { useState } from "react";

const MODERATION_STATUSES = ["new", "in_review", "resolved", "rejected"];

export default function FeedbackModerationPage() {
  const [itemId, setItemId] = useState("");
  const [status, setStatus] = useState("in_review");
  const [schoolId, setSchoolId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function moderate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/feedback/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, schoolId, tenantId }),
      });
      const body = await res.json();
      if (!res.ok) setResult(`Error: ${body.error?.message ?? res.status}`);
      else setResult(`Feedback ${itemId} updated to ${body.item?.status ?? status}`);
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Feedback Moderation</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Feedback Item ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New Status</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {MODERATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">School ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tenant ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
        </div>
        <button
          onClick={moderate}
          disabled={loading || !itemId}
          className="w-full bg-orange-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update Status"}
        </button>
        {result && <p className="text-sm mt-2">{result}</p>}
      </div>
    </div>
  );
}
