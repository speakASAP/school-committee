"use client";
import { useState, useEffect } from "react";

interface PaymentItem {
  id: string;
  amountCzk: number;
  currency: string;
  variableSymbol: string;
  message: string | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  userId: string;
  userName: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Čeká",
  paid: "Zaplaceno",
  expired: "Vypršelo",
  cancelled: "Zrušeno",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reference, setReference] = useState<Record<string, string>>({});

  function loadPayments() {
    setLoading(true);
    const url = new URL("/api/admin/payments", window.location.origin);
    url.searchParams.set("limit", "200");
    if (filterStatus) url.searchParams.set("status", filterStatus);
    fetch(url.toString())
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPayments(); }, [filterStatus]);

  async function confirmPayment(id: string) {
    const ref = reference[id] ?? "";
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: ref }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((p) => p.id === id ? { ...p, status: "paid", paidAt: new Date().toISOString() } : p));
      } else {
        const body = await res.json();
        alert(body.error?.message ?? "Potvrzení selhalo");
      }
    } finally {
      setConfirmingId(null);
    }
  }

  const totalPaid = items.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountCzk, 0);
  const totalPending = items.filter((p) => p.status === "pending").reduce((s, p) => s + p.amountCzk, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold">Platby</h1>
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Všechny stavy</option>
          <option value="pending">Čeká</option>
          <option value="paid">Zaplaceno</option>
          <option value="expired">Vypršelo</option>
          <option value="cancelled">Zrušeno</option>
        </select>
      </div>

      <div className="flex gap-4 flex-wrap text-sm">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <span className="text-green-700 font-semibold">{totalPaid.toLocaleString("cs-CZ")} Kč</span>
          <span className="text-green-600 ml-1">zaplaceno</span>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
          <span className="text-yellow-700 font-semibold">{totalPending.toLocaleString("cs-CZ")} Kč</span>
          <span className="text-yellow-600 ml-1">čeká</span>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Načítám…</p>}

      {!loading && items.length === 0 && (
        <p className="text-gray-400 text-sm">Žádné platby.</p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-bold text-gray-900 text-lg">{item.amountCzk.toLocaleString("cs-CZ")} Kč</span>
                {item.userName && (
                  <span className="ml-2 text-sm text-gray-600">{item.userName}</span>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>VS: <span className="font-mono font-medium text-gray-700">{item.variableSymbol}</span></span>
              <span>·</span>
              <span>Vytvořeno: {new Date(item.createdAt).toLocaleString("cs-CZ", { hour12: false })}</span>
              {item.paidAt && (
                <>
                  <span>·</span>
                  <span className="text-green-700">Zaplaceno: {new Date(item.paidAt).toLocaleString("cs-CZ", { hour12: false })}</span>
                </>
              )}
              {item.expiresAt && item.status === "pending" && (
                <>
                  <span>·</span>
                  <span>Vyprší: {new Date(item.expiresAt).toLocaleDateString("cs-CZ")}</span>
                </>
              )}
            </div>

            {item.message && (
              <p className="text-xs text-gray-500">Zpráva: {item.message}</p>
            )}

            {item.status === "pending" && (
              <div className="flex gap-2 items-center pt-1">
                <input
                  className="border rounded px-2 py-1 text-xs w-48"
                  placeholder="Reference z banky (volitelně)"
                  value={reference[item.id] ?? ""}
                  onChange={(e) => setReference((prev) => ({ ...prev, [item.id]: e.target.value }))}
                />
                <button
                  onClick={() => confirmPayment(item.id)}
                  disabled={confirmingId === item.id}
                  className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {confirmingId === item.id ? "…" : "Potvrdit platbu"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
