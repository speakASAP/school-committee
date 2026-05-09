"use client";
import { useState } from "react";

export default function PaymentsPage() {
  const [paymentId, setPaymentId] = useState("");
  const [reference, setReference] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function confirmPayment() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference, tenantId }),
      });
      const body = await res.json();
      if (!res.ok) setResult(`Error: ${body.error?.message ?? res.status}`);
      else setResult(`Payment ${body.id} confirmed — status: ${body.status}`);
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Manual Payment Confirmation</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Payment Intent ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bank Statement Reference</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 2605000001/0800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tenant ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <button
          onClick={confirmPayment}
          disabled={loading || !paymentId || !reference || !tenantId}
          className="w-full bg-green-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Confirming…" : "Confirm Payment"}
        </button>
        {result && <p className="text-sm mt-2">{result}</p>}
      </div>
    </div>
  );
}
