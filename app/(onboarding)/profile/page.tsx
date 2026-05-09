"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const PARTICIPATION_TYPES = [
  { value: "financial", label: "Financial contribution" },
  { value: "labor", label: "Volunteering / labour" },
  { value: "mixed", label: "Both (financial + volunteering)" },
];

function ProfileForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = searchParams.get("lang") ?? "cs";

  const [form, setForm] = useState({
    tenantId: "",
    schoolId: "",
    classId: "",
    firstName: "",
    lastName: "",
    phone: "",
    participationType: "financial",
    childrenCount: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, language: lang }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error?.message ?? "Failed to save profile"); return; }
      router.replace("/onboarding/consent");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Complete your profile</h1>
      <p className="text-sm text-gray-500 mb-6">Fields marked * are required.</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">First name *</label>
            <input required className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last name *</label>
            <input required className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone (optional)</label>
          <input type="tel" className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Participation *</label>
          <select required className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.participationType} onChange={(e) => set("participationType", e.target.value)}>
            {PARTICIPATION_TYPES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Number of children *</label>
          <input type="number" required min={0} className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.childrenCount} onChange={(e) => set("childrenCount", parseInt(e.target.value) || 0)} />
        </div>
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">School info</p>
          <div>
            <label className="block text-sm font-medium mb-1">Tenant ID *</label>
            <input required className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs"
              placeholder="uuid — provided by your school" value={form.tenantId} onChange={(e) => set("tenantId", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">School ID *</label>
            <input required className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs"
              placeholder="uuid — provided by your school" value={form.schoolId} onChange={(e) => set("schoolId", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Class ID *</label>
            <input required className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs"
              placeholder="uuid — provided by your school" value={form.classId} onChange={(e) => set("classId", e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileForm />
    </Suspense>
  );
}
