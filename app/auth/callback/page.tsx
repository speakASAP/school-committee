"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (!fragment) {
      setError("Neplatný přihlašovací odkaz.");
      return;
    }

    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("Přihlašovací odkaz neobsahuje potřebné tokeny.");
      return;
    }

    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("session");
        return fetch("/api/auth/me");
      })
      .then((res) => res.json())
      .then((data) => {
        const status = data.user?.onboardingStatus;
        if (!status || status === "incomplete") {
          router.replace("/onboarding/profile");
        } else if (status === "profile_complete") {
          router.replace("/onboarding/children");
        } else if (status === "consent_complete") {
          router.replace("/onboarding/set-password");
        } else {
          // complete — onboarding done, go to dashboard
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        setError("Přihlášení se nezdařilo. Zkuste odkaz znovu nebo požádejte o nový.");
      });
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
            Chyba přihlášení
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white font-semibold rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors"
          >
            Zpět na úvodní stránku
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4 animate-spin inline-block">⏳</div>
        <h1 className="text-xl font-semibold text-gray-700 mt-4">
          Přihlašování…
        </h1>
      </div>
    </div>
  );
}
