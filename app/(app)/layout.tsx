import SiteHeader from "@/components/SiteHeader";
import { getAccessToken } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authenticated = Boolean(await getAccessToken());

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <SiteHeader authenticated={authenticated} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
