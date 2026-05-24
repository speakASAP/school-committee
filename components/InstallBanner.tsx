"use client";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if previously dismissed
    if (sessionStorage.getItem("install-banner-dismissed")) return;

    // Detect iOS Safari
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone;
    if (isIos && !isInStandaloneMode) {
      setShowIosBanner(true);
      return;
    }

    // Android / Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("install-banner-dismissed", "1");
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosBanner(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed || (!deferredPrompt && !showIosBanner)) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-blue-200 rounded-2xl shadow-lg p-4 flex items-start gap-3 max-w-md mx-auto">
      <div className="text-2xl shrink-0">📱</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Nainstalujte si aplikaci</p>
        {showIosBanner ? (
          <p className="text-xs text-gray-500 mt-0.5">
            Klepněte na <span className="font-semibold">Sdílet</span> a poté <span className="font-semibold">Přidat na plochu</span>.
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-0.5">
            Přidejte si Školní výbor na plochu telefonu pro rychlý přístup.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {deferredPrompt && (
          <button
            onClick={install}
            className="bg-blue-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5 hover:bg-blue-700"
          >
            Instalovat
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-xs text-gray-400 hover:text-gray-600 text-right"
        >
          Zavřít
        </button>
      </div>
    </div>
  );
}
