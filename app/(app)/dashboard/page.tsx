"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  roles: string[];
  approvalStatus?: string;
  rejectionReason?: string | null;
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
  const isPending = user?.approvalStatus === "pending";
  const isRejected = user?.approvalStatus === "rejected";

  return (
    <div className="space-y-6">
      {/* Approval status banners */}
      {isPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex gap-3">
          <span className="text-xl shrink-0">⏳</span>
          <div>
            <p className="font-semibold text-yellow-800">Váš účet čeká na schválení</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Správce školy váš účet brzy zkontroluje. Mezitím si můžete prohlížet obsah.
            </p>
          </div>
        </div>
      )}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <span className="text-xl shrink-0">❌</span>
          <div>
            <p className="font-semibold text-red-800">Registrace nebyla schválena</p>
            {user?.rejectionReason && (
              <p className="text-sm text-red-700 mt-0.5">Důvod: {user.rejectionReason}</p>
            )}
            <Link href="/account" className="text-sm text-red-600 underline mt-1 inline-block">
              Upravit profil a znovu odeslat →
            </Link>
          </div>
        </div>
      )}

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

        <Link
          href="/account"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg mb-3">
            👤
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Můj profil</h2>
          <p className="text-sm text-gray-500 mt-1">Upravte údaje, děti, heslo a nastavení účtu</p>
        </Link>

        {(user?.roles.includes("teacher") ||
          user?.roles.includes("committee") ||
          user?.roles.includes("school_staff") ||
          user?.roles.includes("admin")) && (
          <Link
            href="/dashboard/tasks/new"
            className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-green-200 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-lg mb-3">
              +
            </div>
            <h2 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors">Vytvořit úkol</h2>
            <p className="text-sm text-gray-500 mt-1">Nahrajte hlas nebo fotky a AI vytvoří úkol za vás</p>
          </Link>
        )}
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
