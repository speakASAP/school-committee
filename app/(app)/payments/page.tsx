"use client";
import { useState } from "react";

interface QrResult {
  paymentIntentId: string;
  variableSymbol: string;
  amountCzk: number;
  qrString: string;
  expiresAt: string;
}

export default function PaymentsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [amountCzk, setAmountCzk] = useState("");
  const [result, setResult] = useState<QrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateQr() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/payments/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schoolId, amountCzk: parseFloat(amountCzk) }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error?.message ?? "Failed to generate QR");
      else setResult(body);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const qrImageUrl = result
    ? `/api/payments/qr-image?q=${encodeURIComponent(result.qrString)}`
    : null;

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">Make a Payment</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">School ID</label>
          <input className="w-full border rounded px-3 py-2 text-sm"
            value={schoolId} onChange={(e) => setSchoolId(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount (CZK)</label>
          <input type="number" className="w-full border rounded px-3 py-2 text-sm"
            value={amountCzk} onChange={(e) => setAmountCzk(e.target.value)} min="1" />
        </div>
        <button onClick={generateQr} disabled={loading || !schoolId || !amountCzk}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50">
          {loading ? "Generating…" : "Generate QR Code"}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {result && qrImageUrl && (
          <div className="border rounded-xl p-6 space-y-4 text-center bg-white">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="QR platba" width={300} height={300} className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Variable symbol: <strong className="font-mono">{result.variableSymbol}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Amount: <strong>{result.amountCzk} Kč</strong>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Scan with your banking app (George, Smart Banka, etc.)
              </p>
              <p className="text-xs text-gray-400">
                Expires: {new Date(result.expiresAt).toLocaleDateString("cs-CZ")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
