"use client";
import { useState, useEffect } from "react";

interface ChildSummary {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  grade: string;
  notes: string | null;
}

interface PendingUser {
  userId: string;
  titleBefore: string | null;
  titleAfter: string | null;
  firstName: string;
  lastName: string;
  bio: string | null;
  phone: string | null;
  schoolId: string;
  approvalStatus: string;
  rejectionReason: string | null;
  createdAt: string;
  children: ChildSummary[];
}

export default function ApprovalsPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModal, setRejectModal] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const tid = d.user?.tenantId ?? "";
        setTenantId(tid);
        return tid;
      })
      .then((tid) => {
        if (!tid) return;
        setLoading(true);
        return fetch(`/api/admin/approvals?tenantId=${tid}&status=${tab === "pending" ? "pending" : ""}`)
          .then((r) => r.json())
          .then((d) => setUsers(d.users ?? []))
          .finally(() => setLoading(false));
      });
  }, [tab]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.ok ? r.json() : { settings: {} })
      .then((d) => setAutoApprove(d.settings?.auto_approve_users === "true"));
  }, []);

  async function toggleAutoApprove() {
    if (autoApprove === null) return;
    setAutoApproveLoading(true);
    try {
      const newVal = !autoApprove;
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: "auto_approve_users", value: String(newVal) }),
      });
      if (res.ok) setAutoApprove(newVal);
    } finally {
      setAutoApproveLoading(false);
    }
  }

  async function bulkApprove() {
    setBulkLoading(true);
    setBulkResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/approvals/bulk-approve", { method: "POST" });
      if (!res.ok) {
        const b = await res.json();
        setError(b.error?.message ?? "Hromadné schválení selhalo");
        return;
      }
      const { approved } = await res.json() as { approved: number };
      setBulkResult(`Schváleno ${approved} uživatelů`);
      if (tenantId) {
        setLoading(true);
        fetch(`/api/admin/approvals?tenantId=${tenantId}&status=pending`)
          .then((r) => r.json())
          .then((d) => setUsers(d.users ?? []))
          .finally(() => setLoading(false));
      }
    } finally {
      setBulkLoading(false);
    }
  }

  async function approve(userId: string) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/approvals/${userId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Schválení se nezdařilo");
        return;
      }
      setUsers((u) => u.filter((user) => user.userId !== userId));
      setSelected(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function reject(userId: string) {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/approvals/${userId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId, reason: rejectReason }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Zamítnutí se nezdařilo");
        return;
      }
      setUsers((u) => u.filter((user) => user.userId !== userId));
      setSelected(null);
      setRejectModal(false);
      setRejectReason("");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Schvalování uživatelů</h1>

      {/* Auto-approve + bulk approve panel */}
      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-sm text-amber-900">Automatické schvalování</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Noví uživatelé jsou schváleni okamžitě po registraci bez čekání na ruční kontrolu.
            </p>
          </div>
          <button
            onClick={toggleAutoApprove}
            disabled={autoApproveLoading || autoApprove === null}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              autoApprove ? "bg-green-500" : "bg-gray-300"
            }`}
            aria-label="Přepnout automatické schvalování"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                autoApprove ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-amber-200">
          <button
            onClick={bulkApprove}
            disabled={bulkLoading}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {bulkLoading ? "Schvaluji…" : "Schválit všechny čekající"}
          </button>
          {bulkResult && <span className="text-sm text-green-700 font-medium">{bulkResult}</span>}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Čekající
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Všichni uživatelé
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Načítám…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-sm">Žádní uživatelé nenalezeni.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-4">Jméno</th>
              <th className="py-2 pr-4">Registrace</th>
              <th className="py-2 pr-4">Děti</th>
              <th className="py-2">Akce</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.userId}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(u)}
              >
                <td className="py-2 pr-4 font-medium">
                {[u.titleBefore, u.firstName, u.lastName, u.titleAfter].filter(Boolean).join(" ")}
              </td>
                <td className="py-2 pr-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString("cs-CZ")}</td>
                <td className="py-2 pr-4">{u.children.length}</td>
                <td className="py-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {u.approvalStatus === "pending" && (
                    <>
                      <button
                        onClick={() => approve(u.userId)}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        Schválit
                      </button>
                      <button
                        onClick={() => { setSelected(u); setRejectModal(true); }}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        Zamítnout
                      </button>
                    </>
                  )}
                  {u.approvalStatus !== "pending" && (
                    <span className={`text-xs font-medium ${u.approvalStatus === "approved" ? "text-green-600" : "text-red-600"}`}>
                      {u.approvalStatus === "approved" ? "Schváleno" : "Zamítnuto"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Detail panel */}
      {selected && !rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">
              {[selected.titleBefore, selected.firstName, selected.lastName, selected.titleAfter].filter(Boolean).join(" ")}
            </h2>
            <p className="text-sm text-gray-500">Registrace: {new Date(selected.createdAt).toLocaleDateString("cs-CZ")}</p>
            {selected.phone && (
              <p className="text-sm text-gray-700">Telefon: <span className="font-medium">{selected.phone}</span></p>
            )}
            {selected.bio && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">O mně</p>
                <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3">{selected.bio}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-2">Děti:</p>
              {selected.children.length === 0 ? (
                <p className="text-sm text-gray-400">Žádné děti nebyly uvedeny.</p>
              ) : (
                <ul className="space-y-1">
                  {selected.children.map((c) => (
                    <li key={c.id} className="text-sm border rounded p-2">
                      <span className="font-medium">{c.firstName} {c.lastName}</span>{" "}
                      <span className="text-gray-500">— {c.grade} {c.className}</span>
                      {c.notes && <span className="text-gray-400 text-xs block">{c.notes}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selected.approvalStatus === "pending" && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => approve(selected.userId)}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Schválit
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Zamítnout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-bold">Zamítnout {[selected.titleBefore, selected.firstName, selected.lastName, selected.titleAfter].filter(Boolean).join(" ")}</h2>
            <p className="text-sm text-gray-500">Uveďte důvod, který bude zobrazen uživateli.</p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none"
              placeholder="Např. Nepodařilo se nám ověřit zápis vašeho dítěte. Kontaktujte prosím školní kancelář."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectModal(false); setRejectReason(""); }}
                className="flex-1 py-2 border rounded-xl text-sm"
              >
                Zrušit
              </button>
              <button
                onClick={() => reject(selected.userId)}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Zamítám…" : "Zamítnout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
