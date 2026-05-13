"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Hesla se neshodují");
      return;
    }
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Nepodařilo se nastavit heslo");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  function skip() {
    setSkipping(true);
    router.replace("/dashboard");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Nastavte si heslo</h1>
      <p className="text-sm text-gray-500 mb-6">
        Přihlásili jste se pomocí odkazu. Nastavte si heslo, abyste se mohli příště přihlásit i bez e-mailu.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nové heslo</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimálně 6 znaků"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Potvrdit heslo</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ukládám…" : "Nastavit heslo a pokračovat"}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={skip}
          disabled={skipping}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Přeskočit — budu se přihlašovat odkazem
        </button>
      </div>
    </div>
  );
}
