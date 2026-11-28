// XO ET — Service Worker (PWA offline support + caching)
// v9: Fix offline SPA fallback (/account, etc.), SKIP_WAITING support, and avoid synthetic 404 responses.
const CACHE_NAME = "xoet-v9";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
];

async function offlineSpaFallback() {
  const rootCached = await caches.match("/");
  if (rootCached) return rootCached;
  const indexCached = await caches.match("/index.html");
  if (indexCached) return indexCached;
  return new Response(
    '<!doctype html><html><body style="background:#0B0B16;color:#EDEEF4;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">Offline</body></html>',
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

// Install — pre-cache essential static assets individually so one missing file never breaks install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn("[SW] Pre-cache skipped for:", asset, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Message — allow client app to activate waiting worker immediately
self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Activate — clean up ALL old caches aggressively, then claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — network-first for everything important, with safe SPA & offline fallbacks
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

  const acceptHeader =
    (event.request.headers && typeof event.request.headers.get === "function"
      ? event.request.headers.get("accept")
      : "") || "";
  const isSpaHtmlRequest =
    event.request.mode === "navigate" ||
    (acceptHeader.includes("text/html") &&
      !url.pathname.startsWith("/_expo/static/") &&
      !url.pathname.match(/\.[a-z0-9]+$/i));

  // For navigation / HTML SPA requests: network-first with cached / offlineSpaFallback
  if (isSpaHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone).catch(() => {}))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return offlineSpaFallback();
        })
    );
    return;
  }

  // For JS and CSS bundles: NETWORK-FIRST to always serve fresh code
  if (url.pathname.match(/\.(js|css)$/) || url.pathname.startsWith("/_expo/static/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone).catch(() => {}))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response("", { status: 503, statusText: "Service Unavailable" });
        })
    );
    return;
  }

  // For images and fonts: cache-first (these rarely change)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|woff2?|ttf|eot|ico|webp|gif)$/i)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone()).catch(() => {});
              }
              return response;
            })
            .catch(() => new Response("", { status: 503, statusText: "Service Unavailable" }));
        })
      )
    );
    return;
  }

  // Default: network-first, serving offlineSpaFallback for extensionless SPA routes
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (!url.pathname.split("/").pop()?.includes(".")) {
        return offlineSpaFallback();
      }
      return new Response("", { status: 503, statusText: "Service Unavailable" });
    })
  );
});
