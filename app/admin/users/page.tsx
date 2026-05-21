"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["parent", "committee", "teacher", "school_staff", "admin"] as const;

interface UserRow {
  userId: string;
  email: string | null;
  titleBefore: string | null;
  titleAfter: string | null;
  firstName: string;
  lastName: string;
  bio: string | null;
  phone: string | null;
  language: string;
  participationType: string;
  onboardingStatus: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  committee: "bg-blue-100 text-blue-800",
  teacher: "bg-purple-100 text-purple-800",
  school_staff: "bg-yellow-100 text-yellow-800",
  parent: "bg-green-100 text-green-800",
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [tenantId, setTenantId] = useState<string>("");

  const fetchUsers = useCallback(async (tid: string) => {
    if (!tid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?tenantId=${encodeURIComponent(tid)}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const tid = d?.user?.tenantId ?? "";
        setTenantId(tid);
        fetchUsers(tid);
      })
      .catch(() => setError("Could not determine tenant"));
  }, [fetchUsers]);

  const showFeedback = (id: string, msg: string, ok: boolean) => {
    setFeedback({ id, msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };

  async function toggleActive(user: UserRow) {
    setActionLoading(`active-${user.userId}`);
    const action = user.isActive ? "deactivate" : "activate";
    try {
      const res = await fetch(`/api/admin/users/${user.userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, tenantId }),
      });
      if (!res.ok) {
        const b = await res.json();
        showFeedback(user.userId, b.error?.message ?? "Error", false);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.userId === user.userId ? { ...u, isActive: !u.isActive } : u)),
        );
        showFeedback(user.userId, `User ${action}d`, true);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function changeRole(user: UserRow, role: string, roleAction: "assign" | "revoke") {
    setActionLoading(`role-${user.userId}-${role}`);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, tenantId, action: roleAction }),
      });
      if (!res.ok) {
        const b = await res.json();
        showFeedback(user.userId, b.error?.message ?? "Error", false);
      } else {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.userId !== user.userId) return u;
            const newRoles =
              roleAction === "assign"
                ? [...new Set([...u.roles, role])]
                : u.roles.filter((r) => r !== role);
            return { ...u, roles: newRoles };
          }),
        );
        showFeedback(user.userId, `Role ${role} ${roleAction}d`, true);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(user: UserRow) {
    setConfirmDelete(null);
    setActionLoading(`delete-${user.userId}`);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const b = await res.json();
        showFeedback(user.userId, b.error?.message ?? "Error", false);
      } else {
        setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
      }
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = users.filter((u) => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    const email = (u.email ?? "").toLowerCase();
    const q = search.toLowerCase();
    if (search && !name.includes(q) && !email.includes(q)) return false;
    if (filterRole !== "all" && !u.roles.includes(filterRole)) return false;
    if (filterActive === "active" && !u.isActive) return false;
    if (filterActive === "inactive" && u.isActive) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => fetchUsers(tenantId)}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-56"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">Active + Inactive</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length} users</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name / Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Roles</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map((user) => (
                <tr
                  key={user.userId}
                  onClick={() => router.push(`/admin/users/${user.userId}`)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${user.isActive ? "" : "opacity-50 bg-gray-50"}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {[user.titleBefore, user.firstName, user.lastName, user.titleAfter].filter(Boolean).join(" ")}
                    </div>
                    {user.email && (
                      <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                    )}
                    {feedback?.id === user.userId && (
                      <span
                        className={`text-xs ${feedback.ok ? "text-green-600" : "text-red-600"}`}
                      >
                        {feedback.msg}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
                      {[...user.roles].sort().map((r) => (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {r}
                          <button
                            onClick={() => changeRole(user, r, "revoke")}
                            disabled={!!actionLoading}
                            title={`Revoke ${r}`}
                            className="text-gray-400 hover:text-gray-700 disabled:opacity-40"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <select
                        className="text-xs border rounded px-1 py-0.5 text-gray-500 ml-1"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) changeRole(user, e.target.value, "assign");
                          e.target.value = "";
                        }}
                        disabled={!!actionLoading}
                      >
                        <option value="">+ role</option>
                        {ROLES.filter((r) => !user.roles.includes(r)).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.participationType}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={actionLoading === `active-${user.userId}`}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      } disabled:opacity-50`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("cs-CZ")}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmDelete(user)}
                      disabled={!!actionLoading}
                      className="text-xs text-red-600 hover:underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold">Remove user?</h2>
            <p className="text-sm text-gray-600">
              This will remove{" "}
              <strong>
                {confirmDelete.firstName} {confirmDelete.lastName}
              </strong>{" "}
              from the school committee platform and revoke all their roles. Their login account will not be deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
