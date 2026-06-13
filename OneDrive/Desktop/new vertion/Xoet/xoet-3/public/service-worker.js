// XO ET — Service Worker (PWA offline support + caching)
// v8: Force cache bust after June 2026 room amounts + UI updates deployment.
const CACHE_NAME = "xoet-v8";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
];

// Install — pre-cache essential static assets and immediately activate
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache failed for some assets:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up ALL old caches aggressively, then claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for everything important, with smart fallbacks
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests entirely (API servers, WebSocket, CDNs)
  if (url.origin !== self.location.origin) return;

  // Skip API and admin routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/")) return;

  // Skip audio/video files entirely — let the browser handle them directly
  if (url.pathname.match(/\.(wav|mp3|ogg|mp4|webm|m4a)$/i)) return;

  // For navigation requests (HTML pages): network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // For JS and CSS bundles: NETWORK-FIRST to always serve fresh code
  // This prevents stale cached bundles with old/broken text from being served.
  if (url.pathname.match(/\.(js|css)$/) || url.pathname.startsWith("/_expo/static/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response("Asset not available offline", { status: 404, statusText: "Offline" });
          });
        })
    );
    return;
  }

  // For images and fonts: cache-first (these rarely change)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|woff2?|ttf|eot|ico|webp|gif)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => {
            return new Response("Asset not available offline", { status: 404, statusText: "Offline" });
          });
        })
      )
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return new Response("Not found (offline)", { status: 404, statusText: "Offline" });
      });
    })
  );
});
