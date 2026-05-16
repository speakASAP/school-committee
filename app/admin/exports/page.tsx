"use client";
import { useState } from "react";

const EXPORT_TYPES = ["payments", "tasks", "feedback"] as const;
type ExportType = typeof EXPORT_TYPES[number];

const EXPORT_LABEL: Record<ExportType, string> = {
  payments: "Platby",
  tasks: "Úkoly",
  feedback: "Zpětná vazba",
};

export default function ExportsPage() {
  const [loading, setLoading] = useState<ExportType | null>(null);

  async function downloadExport(type: ExportType) {
    setLoading(type);
    try {
      const res = await fetch(`/api/admin/exports/${type}`);
      if (!res.ok) {
        const body = await res.json();
        alert(`Export selhal: ${body.error?.message ?? res.status}`);
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
      alert("Chyba sítě při exportu");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">CSV Exporty</h1>
      <div className="flex gap-3 flex-wrap">
        {EXPORT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => downloadExport(type)}
            disabled={loading !== null}
            className="bg-gray-800 text-white rounded px-5 py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors"
          >
            {loading === type ? "Stahování…" : `Exportovat ${EXPORT_LABEL[type]}`}
          </button>
        ))}
      </div>
    </div>
  );
}
