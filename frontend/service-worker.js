// service-worker.js
// Handles offline caching (app shell) and a simple background-sync queue
// for stock checks submitted while offline.

const CACHE_NAME = "stockcheck-shell-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // add your built JS/CSS bundle paths here after build, e.g. "/assets/index.js"
];

// --- Install: pre-cache the app shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// --- Activate: clean up old caches ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// --- Fetch: cache-first for app shell, network-first for API calls ---
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API requests (fresh data, fall back to cache if offline)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for everything else (app shell, static assets)
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// --- Background Sync: replay queued stock checks when back online ---
// Pair this with IndexedDB (e.g. Dexie.js) on the client to store checks
// made offline, then register a sync tag: registration.sync.register("sync-stock-checks")
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-stock-checks") {
    event.waitUntil(syncQueuedChecks());
  }
});

async function syncQueuedChecks() {
  // Placeholder: pull queued checks from IndexedDB and POST them to /api/checks
  // Implement with Dexie.js on the client; this worker just triggers the flush.
  const clients = await self.clients.matchAll();
  clients.forEach((client) =>
    client.postMessage({ type: "SYNC_STOCK_CHECKS" })
  );
}

// --- Push notifications (optional, for check requests/report status) ---
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Stock Check", {
      body: data.body || "You have a new update.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
    })
  );
});
