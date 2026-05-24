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

interface PaymentStatus {
  paid: boolean;
  schoolYear: string;
  paidAt?: string;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-yellow-400 text-base leading-none">★</span>
      ))}
    </div>
  );
}

function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
      🔒 Čeká na schválení
    </span>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => null);

    fetch("/api/payments/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPaymentStatus(d); })
      .catch(() => null);
  }, []);

  const isAdmin = user?.roles.includes("admin") || user?.roles.includes("committee") || user?.roles.includes("school_staff");
  const isPending = user?.approvalStatus === "pending";
  const isRejected = user?.approvalStatus === "rejected";
  const isApproved = !isPending && !isRejected && user !== null;

  return (
    <div className="space-y-6">

      {/* Mission statement */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-blue-800 mb-1">Školní výbor ZŠ Střílky</p>
        <p className="text-sm text-blue-700 leading-relaxed">
          Naším cílem je posilovat spolupráci rodičů a školy — pro lepší budoucnost našich dětí.
          Zapojte se finančně nebo svým časem, sledujte výsledky a sbírejte hvězdičky za každý příspěvek.
        </p>
      </div>

      {/* Approval status banners */}
      {isPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex gap-3">
          <span className="text-xl shrink-0">⏳</span>
          <div>
            <p className="font-semibold text-yellow-800">Váš účet čeká na schválení</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Správce školy váš účet brzy zkontroluje. Mezitím si můžete prohlížet obsah.
              Některé funkce se odemknou po schválení.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Volunteer tasks — open to all, stars shown */}
        <Link
          href="/tasks"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg">
              ✅
            </div>
            <Stars count={3} />
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Dobrovolnické úkoly</h2>
          <p className="text-sm text-gray-500 mt-1">Prohlédněte a přijměte otevřené úkoly</p>
          <p className="text-xs text-yellow-600 font-medium mt-2">★★★ za splněný úkol</p>
        </Link>

        {/* Payments */}
        <Link
          href="/payments"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg">
              💳
            </div>
            <div className="flex flex-col items-end gap-1">
              {paymentStatus?.paid && (
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Zaplaceno {paymentStatus.schoolYear}
                </span>
              )}
              <Stars count={1} />
            </div>
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Platby</h2>
          <p className="text-sm text-gray-500 mt-1">
            {paymentStatus?.paid
              ? "Příspěvek za tento školní rok byl potvrzen."
              : "Vygenerujte QR platbu pro příspěvky škole"}
          </p>
          <p className="text-xs text-yellow-600 font-medium mt-2">★ za zaplacený příspěvek</p>
        </Link>

        {/* Ideas — locked for non-approved */}
        <div className="relative">
          <Link
            href={isApproved ? "/ideas" : "#"}
            className={`block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm transition-all group ${
              isApproved
                ? "hover:shadow-md hover:border-blue-200"
                : "opacity-75 cursor-default pointer-events-none"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg">
                💡
              </div>
              <Stars count={2} />
            </div>
            <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Nápady</h2>
            <p className="text-sm text-gray-500 mt-1">Navrhujte vylepšení a hlasujte pro nápady ostatních</p>
            <p className="text-xs text-yellow-600 font-medium mt-2">★★ za nový nápad nebo hlasování</p>
          </Link>
          {!isApproved && user !== null && (
            <div className="absolute top-3 right-3">
              <LockedBadge />
            </div>
          )}
        </div>

        {/* Events */}
        <Link
          href="/events"
          className="block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg">
              📅
            </div>
            <Stars count={1} />
          </div>
          <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Akce</h2>
          <p className="text-sm text-gray-500 mt-1">Nadcházející školní události a přihlašování</p>
          <p className="text-xs text-yellow-600 font-medium mt-2">★ za účast na akci</p>
        </Link>

        {/* Feedback — locked for non-approved */}
        <div className="relative">
          <Link
            href={isApproved ? "/feedback" : "#"}
            className={`block bg-white rounded-2xl border border-gray-100 p-6 shadow-sm transition-all group ${
              isApproved
                ? "hover:shadow-md hover:border-blue-200"
                : "opacity-75 cursor-default pointer-events-none"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg">
                💬
              </div>
              <Stars count={2} />
            </div>
            <h2 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Zpětná vazba</h2>
            <p className="text-sm text-gray-500 mt-1">Podejte návrhy, dotazy nebo pochvaly</p>
            <p className="text-xs text-yellow-600 font-medium mt-2">★★ za zpětnou vazbu</p>
          </Link>
          {!isApproved && user !== null && (
            <div className="absolute top-3 right-3">
              <LockedBadge />
            </div>
          )}
        </div>

        {/* Transparency report */}
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

        {/* Profile */}
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
