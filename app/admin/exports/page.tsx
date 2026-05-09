"use client";
import { useState } from "react";

const EXPORT_TYPES = ["payments", "tasks", "feedback"] as const;
type ExportType = typeof EXPORT_TYPES[number];

export default function ExportsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState<ExportType | null>(null);

  async function downloadExport(type: ExportType) {
    if (!schoolId || !tenantId) return;
    setLoading(type);
    try {
      const res = await fetch(
        `/api/admin/exports/${type}?schoolId=${encodeURIComponent(schoolId)}&tenantId=${encodeURIComponent(tenantId)}`,
      );
      if (!res.ok) {
        const body = await res.json();
        alert(`Export failed: ${body.error?.message ?? res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Network error during export");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">CSV Exports</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">School ID</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
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
        <div className="flex gap-3 flex-wrap">
          {EXPORT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => downloadExport(type)}
              disabled={loading !== null || !schoolId || !tenantId}
              className="flex-1 bg-gray-800 text-white rounded px-4 py-2 text-sm disabled:opacity-50 capitalize"
            >
              {loading === type ? "Downloading…" : `Export ${type}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
