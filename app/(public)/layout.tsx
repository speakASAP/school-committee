import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import { getAccessToken } from "@/lib/auth/session";

// Public routes render for signed-in visitors too, so the header's auth state
// comes from the session cookie rather than a client-side guess.
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const authenticated = Boolean(await getAccessToken());

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader authenticated={authenticated} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-100 px-4 py-8 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: "QR příspěvky", href: "/payments" },
              { label: "Dobrovolnictví", href: "/tasks" },
              { label: "Nápady", href: "/ideas" },
              { label: "Transparentnost", href: "/report" },
              { label: "GDPR", href: "/gdpr" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors">{l.label}</a>
            ))}
          </div>
          <p className="text-xs text-gray-400" suppressHydrationWarning>
            © {new Date().getFullYear()} Školní výbor · strilkove.cz
          </p>
        </div>
      </footer>
    </div>
  );
}
