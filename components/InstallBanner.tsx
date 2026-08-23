"use client";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "desktop" | "android";

const DISMISS_KEY = "install-banner-dismissed";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari does not implement display-mode, it exposes navigator.standalone
  return !!(navigator as Navigator & { standalone?: boolean }).standalone;
}

/** Manual install steps for browsers that never fire beforeinstallprompt. */
function manualHint(platform: Platform): string {
  if (platform === "ios") {
    return "Klepněte na Sdílet a poté Přidat na plochu.";
  }
  if (platform === "desktop") {
    return "V adresním řádku klepněte na ikonu instalace, nebo v menu prohlížeče zvolte „Instalovat aplikaci“.";
  }
  return "V menu prohlížeče zvolte „Přidat na plochu“.";
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch (err) {
      // Storage can throw in private mode / blocked-cookie contexts. Not fatal
      // for this banner, but never silent.
      console.warn("[pwa] could not read install-banner dismissal", { error: String(err) });
    }
    if (dismissed) return;

    const detected = detectPlatform();
    setPlatform(detected);
    setVisible(true);

    // Chrome, Edge and Android fire this once the app meets install criteria
    // (manifest + service worker + HTTPS). Capturing it lets us install with
    // one click instead of showing manual steps.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => setVisible(false);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch (err) {
      console.warn("[pwa] could not persist install-banner dismissal", { error: String(err) });
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    } catch (err) {
      console.error("[pwa] install prompt failed", {
        platform,
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
      return;
    }
    dismiss();
  };

  if (!visible || !platform) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-blue-200 rounded-2xl shadow-lg p-4 flex items-start gap-3 max-w-md mx-auto sm:left-auto sm:right-4 sm:mx-0">
      <div className="text-2xl shrink-0">{platform === "desktop" ? "💻" : "📱"}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Nainstalujte si aplikaci</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {deferredPrompt
            ? platform === "desktop"
              ? "Přidejte si Školní výbor na plochu počítače pro rychlý přístup."
              : "Přidejte si Školní výbor na plochu telefonu pro rychlý přístup."
            : manualHint(platform)}
        </p>
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
