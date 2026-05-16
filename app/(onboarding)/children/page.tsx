"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

interface ChildForm {
  firstName: string;
  lastName: string;
  classId: string;
  notes: string;
}

interface ClassOption {
  id: string;
  name: string;
  grade: string;
}

function ChildrenForm() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildForm[]>([
    { firstName: "", lastName: "", classId: "", notes: "" },
  ]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load school info from session via /api/auth/me
  const [schoolId, setSchoolId] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        const sid = data.user?.schoolId ?? "";
        const tid = data.user?.tenantId ?? "";
        setSchoolId(sid);
        setTenantId(tid);
        if (sid) {
          fetch(`/api/public/classes?schoolId=${sid}`)
            .then((r) => r.json())
            .then((d) => setClasses(d.classes ?? []));
        }
      });
  }, []);

  function addChild() {
    setChildren((c) => [...c, { firstName: "", lastName: "", classId: "", notes: "" }]);
  }

  function removeChild(index: number) {
    setChildren((c) => c.filter((_, i) => i !== index));
  }

  function setField(index: number, field: keyof ChildForm, value: string) {
    setChildren((c) => c.map((child, i) => (i === index ? { ...child, [field]: value } : child)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/children", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId, schoolId, children }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to save children");
        return;
      }
      router.replace("/onboarding/consent");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Your children</h1>
      <p className="text-sm text-gray-500 mb-6">
        Add each child who attends the school. School staff will verify this information.
      </p>
      <form onSubmit={submit} className="space-y-6">
        {children.map((child, i) => (
          <div key={i} className="border rounded-xl p-4 space-y-3 relative">
            <p className="text-sm font-medium text-gray-700">Child {i + 1}</p>
            {children.length > 1 && (
              <button
                type="button"
                onClick={() => removeChild(i)}
                className="absolute top-3 right-3 text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">First name *</label>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={child.firstName}
                  onChange={(e) => setField(i, "firstName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last name *</label>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={child.lastName}
                  onChange={(e) => setField(i, "lastName", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Class *</label>
              <select
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={child.classId}
                onChange={(e) => setField(i, "classId", e.target.value)}
              >
                <option value="">Select a class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. teacher Nováková, class 2B"
                value={child.notes}
                onChange={(e) => setField(i, "notes", e.target.value)}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addChild}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          + Add another child
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

export default function ChildrenPage() {
  return (
    <Suspense>
      <ChildrenForm />
    </Suspense>
  );
}
