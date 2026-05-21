"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const ROLES = ["parent", "committee", "teacher", "school_staff", "admin"] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  committee: "bg-blue-100 text-blue-800",
  teacher: "bg-purple-100 text-purple-800",
  school_staff: "bg-yellow-100 text-yellow-800",
  parent: "bg-green-100 text-green-800",
};

interface UserDetail {
  userId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  language: string;
  participationType: string;
  onboardingStatus: string;
  approvalStatus: string;
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const tid = d?.user?.tenantId ?? "";
        setTenantId(tid);
        return fetch(`/api/admin/users?tenantId=${encodeURIComponent(tid)}`);
      })
      .then((r) => r.json())
      .then((d) => {
        const found = (d.users ?? []).find((u: UserDetail) => u.userId === id);
        if (!found) setError("Uživatel nenalezen");
        else setUser(found);
      })
      .catch(() => setError("Chyba načítání"))
      .finally(() => setLoading(false));
  }, [id]);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  async function toggleActive() {
    if (!user) return;
    setActionLoading("active");
    const action = user.isActive ? "deactivate" : "activate";
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, tenantId }),
      });
      if (!res.ok) {
        const b = await res.json();
        showFeedback(b.error?.message ?? "Error", false);
      } else {
        setUser((u) => u ? { ...u, isActive: !u.isActive } : u);
        showFeedback(`User ${action}d`, true);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function changeRole(role: string, roleAction: "assign" | "revoke") {
    if (!user) return;
    setActionLoading(`role-${role}`);
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, tenantId, action: roleAction }),
      });
      if (!res.ok) {
        const b = await res.json();
        showFeedback(b.error?.message ?? "Error", false);
      } else {
        setUser((u) => {
          if (!u) return u;
          const newRoles = roleAction === "assign"
            ? [...new Set([...u.roles, role])]
            : u.roles.filter((r) => r !== role);
          return { ...u, roles: newRoles };
        });
        showFeedback(`Role ${role} ${roleAction}d`, true);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser() {
    setConfirmDelete(false);
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const b = await res.json();
        showFeedback(b.error?.message ?? "Error", false);
      } else {
        router.replace("/admin/users");
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>;
  if (!user) return null;

  const sortedRoles = [...user.roles].sort();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">← Zpět na uživatele</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            {user.email && <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>}
          </div>
          <button
            onClick={toggleActive}
            disabled={actionLoading === "active"}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              user.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } disabled:opacity-50`}
          >
            {user.isActive ? "Aktivní" : "Neaktivní"}
          </button>
        </div>

        {feedback && (
          <p className={`text-sm ${feedback.ok ? "text-green-600" : "text-red-600"}`}>{feedback.msg}</p>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-400 text-xs uppercase tracking-wide">Telefon</dt>
            <dd className="text-gray-800 mt-0.5">{user.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs uppercase tracking-wide">Jazyk</dt>
            <dd className="text-gray-800 mt-0.5">{user.language}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs uppercase tracking-wide">Zapojení</dt>
            <dd className="text-gray-800 mt-0.5">{user.participationType}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs uppercase tracking-wide">Stav registrace</dt>
            <dd className="text-gray-800 mt-0.5">{user.onboardingStatus}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs uppercase tracking-wide">Stav schválení</dt>
            <dd className="text-gray-800 mt-0.5">{user.approvalStatus}</dd>
          </div>
          {user.rejectionReason && (
            <div className="col-span-2">
              <dt className="text-gray-400 text-xs uppercase tracking-wide">Důvod zamítnutí</dt>
              <dd className="text-red-700 mt-0.5">{user.rejectionReason}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400 text-xs uppercase tracking-wide">Registrován</dt>
            <dd className="text-gray-800 mt-0.5">{new Date(user.createdAt).toLocaleDateString("cs-CZ")}</dd>
          </div>
          <div>
            <dt className="text-gray-400 text-xs uppercase tracking-wide">ID</dt>
            <dd className="text-gray-500 mt-0.5 font-mono text-xs break-all">{user.userId}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Role</h2>
        <div className="flex flex-wrap gap-2">
          {sortedRoles.map((r) => (
            <span
              key={r}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-700"}`}
            >
              {r}
              <button
                onClick={() => changeRole(r, "revoke")}
                disabled={!!actionLoading}
                title={`Odebrat ${r}`}
                className="ml-1 text-gray-400 hover:text-gray-700 disabled:opacity-40"
              >
                ×
              </button>
            </span>
          ))}
          {sortedRoles.length === 0 && <span className="text-sm text-gray-400">Žádné role</span>}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-gray-500">Přidat:</span>
          <select
            className="text-xs border rounded px-2 py-1 text-gray-600"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) changeRole(e.target.value, "assign");
              e.target.value = "";
            }}
            disabled={!!actionLoading}
          >
            <option value="">— vyberte roli —</option>
            {ROLES.filter((r) => !user.roles.includes(r)).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 space-y-3">
        <h2 className="text-sm font-semibold text-red-700">Nebezpečná zóna</h2>
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={!!actionLoading}
          className="text-sm text-red-600 hover:underline disabled:opacity-40"
        >
          Odebrat uživatele z platformy
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold">Odebrat uživatele?</h2>
            <p className="text-sm text-gray-600">
              Tím odeberete <strong>{user.firstName} {user.lastName}</strong> z platformy a zrušíte všechny jejich role. Přihlašovací účet nebude smazán.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">Zrušit</button>
              <button onClick={deleteUser} className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700">Odebrat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
