/**
 * Minimal service worker for school-committee.
 *
 * Scope is deliberately narrow: this app is auth-gated and server-rendered, so
 * caching HTML would risk serving one parent's page to another. We therefore
 * cache ONLY immutable static assets and never HTML, never /api/*.
 *
 * Failures are surfaced, not swallowed: a fetch error propagates to the browser
 * exactly as it would without a service worker.
 */

const CACHE_VERSION = "sc-static-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/logo.webp",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Precache failure must be visible — it means a listed asset 404s.
        console.error("[sw] precache failed", { cache: CACHE_VERSION, error: String(err) });
        throw err;
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim())
      .catch((err) => {
        console.error("[sw] activate/cleanup failed", { error: String(err) });
        throw err;
      }),
  );
});

function isCacheableStatic(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|webp|svg|ico|css|js|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navigations: always network. Only if the network is genuinely unreachable
  // do we show the offline page — an HTTP error (401/403/500) passes through
  // untouched so the user sees the real failure.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch((err) => {
        console.warn("[sw] navigation offline, serving fallback", {
          url: url.pathname,
          error: String(err),
        });
        return caches.match(OFFLINE_URL).then((cached) => {
          if (cached) return cached;
          throw err;
        });
      }),
    );
    return;
  }

  if (!isCacheableStatic(url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(request, copy))
            .catch((err) =>
              console.error("[sw] cache.put failed", {
                url: url.pathname,
                error: String(err),
              }),
            );
        }
        return response;
      });
    }),
  );
});
