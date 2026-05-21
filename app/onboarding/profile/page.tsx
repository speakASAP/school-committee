"use client";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

const PARTICIPATION_TYPES = [
  { value: "financial", label: "Finanční příspěvek" },
  { value: "labor", label: "Dobrovolnická pomoc" },
  { value: "mixed", label: "Oboje (příspěvek i pomoc)" },
];

function ProfileForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    participationType: "financial",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
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
        body: JSON.stringify({ ...form, language: "cs" }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error?.message ?? "Nepodařilo se uložit profil"); return; }
      if (body.alreadyComplete) { router.replace(body.redirectTo ?? "/dashboard"); return; }
      router.replace("/onboarding/children");
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Krok 1 ze 3</p>
        <h1 className="text-2xl font-bold text-gray-900">Vyplňte svůj profil</h1>
        <p className="text-sm text-gray-500 mt-1">Pole označená * jsou povinná.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Jméno *</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Příjmení *</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefon (nepovinné)</label>
          <input
            type="tel"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+420 123 456 789"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Způsob zapojení *</label>
          <select
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.participationType}
            onChange={(e) => set("participationType", e.target.value)}
          >
            {PARTICIPATION_TYPES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ukládám…" : "Pokračovat"}
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
