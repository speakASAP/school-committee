"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  roles: string[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => null);
  }, []);

  const isAdmin = user?.roles.includes("admin") || user?.roles.includes("committee");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Vítejte zpět</h1>
        {user && <p className="text-sm text-gray-500 mt-1">{user.email}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/tasks"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg mb-3">
            ✅
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Dobrovolnické úkoly</h2>
          <p className="text-sm text-gray-500 mt-1">Prohlédněte a přijměte otevřené úkoly</p>
        </Link>

        <Link
          href="/payments"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg mb-3">
            💳
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Platby</h2>
          <p className="text-sm text-gray-500 mt-1">Vygenerujte QR platbu pro příspěvky škole</p>
        </Link>

        <Link
          href="/feedback"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg mb-3">
            💬
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Zpětná vazba</h2>
          <p className="text-sm text-gray-500 mt-1">Podejte návrhy, dotazy nebo pochvaly</p>
        </Link>

        <Link
          href="/report"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg mb-3">
            📊
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Zpráva o transparentnosti</h2>
          <p className="text-sm text-gray-500 mt-1">Podívejte se, jak jsou využívány vybrané prostředky</p>
        </Link>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Administrátor</p>
          <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">
            Přejít do administrace →
          </Link>
        </div>
      )}

      <div className="text-center">
        <Link href="/account/delete" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
          Žádost o smazání účtu
        </Link>
      </div>
    </div>
  );
}
