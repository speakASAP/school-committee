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
  firstName: string;
  lastName: string;
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
        setError(body.error?.message ?? "Failed to approve");
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
        setError(body.error?.message ?? "Failed to reject");
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
      <h1 className="text-2xl font-bold mb-4">User Approvals</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Pending
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          All Users
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-sm">No users found.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Registered</th>
              <th className="py-2 pr-4">Children</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.userId}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(u)}
              >
                <td className="py-2 pr-4 font-medium">{u.firstName} {u.lastName}</td>
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
                        Approve
                      </button>
                      <button
                        onClick={() => { setSelected(u); setRejectModal(true); }}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {u.approvalStatus !== "pending" && (
                    <span className={`text-xs font-medium ${u.approvalStatus === "approved" ? "text-green-600" : "text-red-600"}`}>
                      {u.approvalStatus}
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
            <h2 className="text-lg font-bold">{selected.firstName} {selected.lastName}</h2>
            <p className="text-sm text-gray-500">Registered: {new Date(selected.createdAt).toLocaleDateString("cs-CZ")}</p>
            <div>
              <p className="text-sm font-medium mb-2">Children:</p>
              {selected.children.length === 0 ? (
                <p className="text-sm text-gray-400">No children listed.</p>
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
                  Approve
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
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
            <h2 className="text-lg font-bold">Reject {selected.firstName} {selected.lastName}</h2>
            <p className="text-sm text-gray-500">Please provide a reason that will be shown to the user.</p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none"
              placeholder="e.g. We could not verify your child's enrollment. Please contact the school office."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectModal(false); setRejectReason(""); }}
                className="flex-1 py-2 border rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => reject(selected.userId)}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
