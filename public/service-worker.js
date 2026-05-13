self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Simple fetch pass-through. Add caching logic here later if needed.
  event.respondWith(fetch(event.request));
});
