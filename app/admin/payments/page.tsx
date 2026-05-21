"use client";
import { useState, useEffect, useCallback } from "react";
import { currentSchoolYear } from "@/lib/payments/qr-generator";

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
  childrenNames: string[];
}

type SortKey = "userName" | "amountCzk" | "createdAt" | "paidAt" | "status";
type SortDir = "asc" | "desc";

const STATUS_LABEL: Record<string, string> = {
  pending: "Čeká",
  paid: "Zaplaceno",
  reconciled: "Odsouhlaseno",
  manually_corrected: "Opraveno",
  failed: "Selhalo",
  expired: "Vypršelo",
  cancelled: "Zrušeno",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  reconciled: "bg-green-100 text-green-700",
  manually_corrected: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-600",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-500",
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-blue-600 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function AdminPaymentsPage() {
  const thisYear = currentSchoolYear();

  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear] = useState(thisYear);
  const [filterName, setFilterName] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reference, setReference] = useState<Record<string, string>>({});

  const loadPayments = useCallback(() => {
    setLoading(true);
    const url = new URL("/api/admin/payments", window.location.origin);
    url.searchParams.set("limit", "500");
    if (filterStatus) url.searchParams.set("status", filterStatus);
    if (filterYear) url.searchParams.set("schoolYear", filterYear);
    url.searchParams.set("sortBy", sortBy === "userName" ? "createdAt" : sortBy);
    url.searchParams.set("sortDir", sortDir);
    fetch(url.toString())
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, [filterStatus, filterYear, sortBy, sortDir]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

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
        setItems((prev) =>
          prev.map((p) => p.id === id ? { ...p, status: "paid", paidAt: new Date().toISOString() } : p),
        );
      } else {
        const body = await res.json();
        alert(body.error?.message ?? "Potvrzení selhalo");
      }
    } finally {
      setConfirmingId(null);
    }
  }

  // Client-side name filter + userName sort applied on the already-fetched list
  let displayed = items.filter((p) => {
    if (!filterName) return true;
    const q = filterName.toLowerCase();
    return (
      (p.userName ?? "").toLowerCase().includes(q) ||
      p.childrenNames.some((c) => c.toLowerCase().includes(q))
    );
  });

  if (sortBy === "userName") {
    displayed = [...displayed].sort((a, b) => {
      const cmp = (a.userName ?? "").localeCompare(b.userName ?? "", "cs");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const paidItems = displayed.filter((p) => ["paid", "reconciled", "manually_corrected"].includes(p.status));
  const pendingItems = displayed.filter((p) => p.status === "pending");
  const uniquePaidParents = new Set(paidItems.map((p) => p.userId)).size;
  const totalPaidCzk = paidItems.reduce((s, p) => s + p.amountCzk, 0);
  const totalPendingCzk = pendingItems.reduce((s, p) => s + p.amountCzk, 0);

  const thClass = "px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none cursor-pointer hover:text-gray-800 whitespace-nowrap";

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Přehled plateb</h1>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm">
          <span className="font-bold text-green-800">{totalPaidCzk.toLocaleString("cs-CZ")} Kč</span>
          <span className="text-green-600 ml-1">zaplaceno</span>
          <span className="text-green-500 ml-2 text-xs">({uniquePaidParents} rod.)</span>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm">
          <span className="font-bold text-yellow-800">{totalPendingCzk.toLocaleString("cs-CZ")} Kč</span>
          <span className="text-yellow-600 ml-1">čeká ({pendingItems.length})</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm">
          <span className="font-bold text-gray-700">{displayed.length}</span>
          <span className="text-gray-500 ml-1">záznamů celkem</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Školní rok</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">Všechny roky</option>
            {[thisYear, prevSchoolYear(thisYear)].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Stav</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Hledat rodiče / dítě</label>
          <input
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-52"
            placeholder="Jméno…"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
        </div>
        <button
          onClick={loadPayments}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Obnovit
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Načítám…</p>}

      {!loading && displayed.length === 0 && (
        <p className="text-gray-400 text-sm">Žádné záznamy neodpovídají filtru.</p>
      )}

      {/* Table */}
      {!loading && displayed.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={thClass} onClick={() => toggleSort("userName")}>
                  Rodič <SortIcon active={sortBy === "userName"} dir={sortDir} />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Děti
                </th>
                <th className={thClass} onClick={() => toggleSort("amountCzk")}>
                  Částka <SortIcon active={sortBy === "amountCzk"} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort("status")}>
                  Stav <SortIcon active={sortBy === "status"} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort("createdAt")}>
                  Vytvořeno <SortIcon active={sortBy === "createdAt"} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort("paidAt")}>
                  Zaplaceno <SortIcon active={sortBy === "paidAt"} dir={sortDir} />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  VS
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {item.userName ?? <span className="text-gray-400 italic">neznámý</span>}
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">
                    {item.childrenNames.length > 0
                      ? item.childrenNames.join(", ")
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    {item.amountCzk.toLocaleString("cs-CZ")} Kč
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString("cs-CZ")}
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                    {item.paidAt
                      ? new Date(item.paidAt).toLocaleDateString("cs-CZ")
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500">
                    {item.variableSymbol}
                  </td>
                  <td className="px-3 py-3">
                    {item.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <input
                          className="border border-gray-200 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="Reference (vol.)"
                          value={reference[item.id] ?? ""}
                          onChange={(e) => setReference((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <button
                          onClick={() => confirmPayment(item.id)}
                          disabled={confirmingId === item.id}
                          className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {confirmingId === item.id ? "…" : "Potvrdit"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function prevSchoolYear(year: string): string {
  const [start] = year.split("/");
  const y = parseInt(start, 10) - 1;
  return `${y}/${String(y + 1).slice(-2)}`;
}
