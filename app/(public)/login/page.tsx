"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  buildHostedAuthLoginUrl,
  createHostedAuthState,
  storeHostedAuthState,
} from "@/lib/auth/hosted-auth";

function LoginRedirect() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const accountDeleted = searchParams.get("deleted") === "1";

  useEffect(() => {
    const next = searchParams.get("next") ?? "/dashboard";

    try {
      const state = createHostedAuthState(next);
      storeHostedAuthState(window.sessionStorage, state);
      window.location.assign(
        buildHostedAuthLoginUrl({
          origin: window.location.origin,
          state: state.nonce,
        }),
      );
    } catch {
      setError("Nepodařilo se zahájit přihlášení. Zkuste to prosím znovu.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-4 text-center">
        {accountDeleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 text-left">
            Váš účet byl trvale smazán. Všechna vaše osobní data byla odstraněna.
          </div>
        )}
        <div className="text-4xl" aria-hidden="true">↗</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Přihlášení</h1>
          <p className="text-sm text-gray-500 mt-1">Přesměrováváme vás na centrální Alfares Auth.</p>
        </div>
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
            >
              Zkusit znovu
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-600">Okamžik prosím...</p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginRedirect />
    </Suspense>
  );
}
