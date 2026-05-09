"use client";
import { useState } from "react";

const ROLES = ["parent", "committee", "teacher", "school_staff", "admin"];

export default function UsersPage() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("committee");
  const [tenantId, setTenantId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function assignRole(action: "assign" | "revoke") {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, tenantId, action }),
      });
      const body = await res.json();
      if (!res.ok) setResult(`Error: ${body.error?.message ?? res.status}`);
      else setResult(`Success: role ${role} ${action}ed for user ${userId}`);
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">User Role Management</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">User ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="uuid"
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
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => assignRole("assign")}
            disabled={loading || !userId || !tenantId}
            className="flex-1 bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Assign
          </button>
          <button
            onClick={() => assignRole("revoke")}
            disabled={loading || !userId || !tenantId}
            className="flex-1 bg-red-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Revoke
          </button>
        </div>
        {result && <p className="text-sm mt-2">{result}</p>}
      </div>
    </div>
  );
}
