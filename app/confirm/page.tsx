import { redirect } from "next/navigation";
import { upsertProfile } from "@/lib/db/profiles";

const LEADS_SERVICE_URL =
  process.env.LEADS_SERVICE_URL ?? "https://leads.alfares.cz";
const AUTH_SERVICE_BASE_URL =
  process.env.AUTH_SERVICE_BASE_URL ?? "";
const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://school-committee.alfares.cz";
const AUTH_INTERNAL_SERVICE_TOKEN =
  process.env.AUTH_INTERNAL_SERVICE_TOKEN ?? "";
const DEFAULT_TENANT_ID =
  process.env.DEFAULT_TENANT_ID ?? "";
const DEFAULT_SCHOOL_ID =
  process.env.DEFAULT_SCHOOL_ID ?? "";

async function confirmLead(token: string): Promise<{ email: string | null } | null | "error"> {
  try {
    const res = await fetch(
      `${LEADS_SERVICE_URL}/api/leads/confirm/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as { email?: string | null };
      return { email: data.email ?? null };
    }
    if (res.status === 404) return null;
    return "error";
  } catch {
    return "error";
  }
}

async function getMagicLinkResult(email: string): Promise<{ verifyUrl: string; userId: string } | null> {
  if (!AUTH_SERVICE_BASE_URL || !AUTH_INTERNAL_SERVICE_TOKEN) return null;
  try {
    const res = await fetch(`${AUTH_SERVICE_BASE_URL}/auth/internal/magic-link/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-service-token": AUTH_INTERNAL_SERVICE_TOKEN,
        "x-service-name": "school-committee",
      },
      body: JSON.stringify({
        email,
        return_url: `${APP_BASE_URL}/auth/callback`,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { verifyUrl?: string; userId?: string };
    if (!data.verifyUrl || !data.userId) return null;
    return { verifyUrl: data.verifyUrl, userId: data.userId };
  } catch {
    return null;
  }
}

async function ensureProfile(userId: string, email: string): Promise<void> {
  if (!DEFAULT_TENANT_ID || !DEFAULT_SCHOOL_ID) return;
  try {
    const emailPrefix = email.split("@")[0] ?? "";
    await upsertProfile(userId, {
      tenantId: DEFAULT_TENANT_ID,
      schoolId: DEFAULT_SCHOOL_ID,
      firstName: emailPrefix,
      lastName: "",
      participationType: "parent",
      onboardingStatus: "incomplete",
    });
  } catch {
    // Non-fatal: user can complete profile during onboarding
  }
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) redirect("/");

  const result = await confirmLead(token);

  if (result === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Neplatný odkaz</h1>
          <p className="text-gray-600 mb-6">
            Tento potvrzovací odkaz není platný nebo již byl použit.
          </p>
          <a href="/" className="inline-block bg-blue-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors">
            Zpět na úvodní stránku
          </a>
        </div>
      </div>
    );
  }

  if (result === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Něco se pokazilo</h1>
          <p className="text-gray-600 mb-6">
            Nepodařilo se zpracovat váš požadavek. Zkuste to prosím znovu nebo nás kontaktujte.
          </p>
          <a href="/" className="inline-block bg-blue-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors">
            Zpět na úvodní stránku
          </a>
        </div>
      </div>
    );
  }

  if (result.email) {
    const magicLink = await getMagicLinkResult(result.email);
    if (magicLink) {
      await ensureProfile(magicLink.userId, result.email);
      redirect(magicLink.verifyUrl);
    }
  }

  // No email contact method or auth service unavailable — still confirmed, go to login
  redirect("/login");
}
