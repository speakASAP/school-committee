"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This step is now merged into /onboarding/consent.
// Anyone landing here is redirected to the correct step.
export default function SetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me", { redirect: "manual" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const status = data?.user?.onboardingStatus;
        if (!status || status === "incomplete") router.replace("/onboarding/profile");
        else if (status === "profile_complete") router.replace("/onboarding/children");
        else if (status === "consent_complete") router.replace("/onboarding/consent");
        else router.replace("/dashboard");
      })
      .catch(() => router.replace("/onboarding/consent"));
  }, [router]);

  return null;
}
