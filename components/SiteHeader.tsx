"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

const PUBLIC_NAV = [
  { href: "/payments", label: "Platby" },
  { href: "/tasks", label: "Úkoly" },
  { href: "/ideas", label: "Nápady" },
  { href: "/report", label: "Zpráva" },
];

const AUTH_NAV = [
  { href: "/dashboard", label: "Domů" },
  { href: "/payments", label: "Platby" },
  { href: "/tasks", label: "Úkoly" },
  { href: "/ideas", label: "Nápady" },
  { href: "/hall-of-fame", label: "Síň slávy" },
  { href: "/events", label: "Akce" },
  { href: "/feedback", label: "Zpětná vazba" },
  { href: "/account", label: "Profil" },
];

interface Props {
  /** Force auth state instead of fetching — use in server-rendered wrappers that already know */
  authenticated?: boolean;
}

export default function SiteHeader({ authenticated }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(() => {
    if (authenticated !== undefined) return authenticated;
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("authed");
      if (cached !== null) return cached === "1";
    }
    return null;
  });
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authenticated !== undefined) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const val = !!d?.user;
        setAuthed(val);
        sessionStorage.setItem("authed", val ? "1" : "0");
      })
      .catch(() => {
        setAuthed(false);
        sessionStorage.setItem("authed", "0");
      });
  }, [authenticated]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const nav = authed ? AUTH_NAV : PUBLIC_NAV;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm" ref={menuRef}>
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
          <Image src="/logo.webp" alt="Spolek Střílkové" width={36} height={36} loading="lazy" />
          <span className="text-base font-bold text-blue-700 hidden xs:inline">Školní výbor</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {nav.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <a
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-b-2 ${
                  active
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-blue-700 hover:bg-blue-50"
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>

        {/* Desktop auth button */}
        <div className="hidden sm:flex items-center min-w-[88px] justify-end">
          {authed === null ? (
            <span className="w-20 h-8 rounded-lg bg-gray-100 animate-pulse" />
          ) : authed ? (
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-blue-700 font-medium transition-colors"
            >
              Odhlásit se
            </button>
          ) : (
            <a
              href={`/login${pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""}`}
              className="text-sm font-medium bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
            >
              Přihlásit se
            </a>
          )}
        </div>

        {/* Hamburger button — mobile only */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Zavřít menu" : "Otevřít menu"}
          aria-expanded={open}
          className="sm:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-gray-50 transition-colors gap-1.5"
        >
          <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-gray-700 rounded transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1 shadow-md">
          {nav.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                pathname === href || pathname.startsWith(href + "/")
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-700 hover:text-blue-700 hover:bg-blue-50"
              }`}
            >
              {label}
            </a>
          ))}
          <div className="mt-1 pt-2 border-t border-gray-100">
            {authed === null ? null : authed ? (
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Odhlásit se
              </button>
            ) : (
              <a
                href={`/login${pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""}`}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-center"
              >
                Přihlásit se
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
