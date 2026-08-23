"use client";
import { useEffect } from "react";

/**
 * Registers /sw.js. The service worker is what makes the app installable —
 * Chrome and Edge refuse the install prompt on desktop without one.
 *
 * Registration failures are logged at error level with full context rather
 * than swallowed: a failed registration silently disables installability.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      console.warn("[pwa] serviceWorker unsupported — app will not be installable");
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("[pwa] service worker registration failed", {
        script: "/sw.js",
        scope: "/",
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    });
  }, []);

  return null;
}
