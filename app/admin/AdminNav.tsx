"use client";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/admin/approvals", label: "Schvalování" },
  { href: "/admin/messages", label: "💬 Zprávy" },
  { href: "/admin/users", label: "Uživatelé" },
  { href: "/admin/tasks", label: "Úkoly" },
  { href: "/admin/payments", label: "Platby" },
  { href: "/admin/feedback", label: "Zpětná vazba" },
  { href: "/admin/ideas", label: "Nápady" },
];

export default function AdminNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-gray-900 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <a href="/admin" className="text-lg font-bold tracking-tight">Admin</a>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Zavřít menu" : "Otevřít menu"}
          aria-expanded={open}
          className="md:hidden p-2 rounded hover:bg-gray-700 transition-colors"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded px-3 py-1.5 text-sm hover:bg-gray-700 transition-colors">
              {l.label}
            </a>
          ))}
          <a href="/dashboard" className="ml-3 rounded px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors border-l border-gray-700 pl-4">
            ← Dashboard
          </a>
        </nav>
      </div>

      {open && (
        <nav className="md:hidden border-t border-gray-700 px-2 pb-3 space-y-0.5">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="border-t border-gray-700 mt-2 pt-2">
            <a
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              ← Dashboard
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
