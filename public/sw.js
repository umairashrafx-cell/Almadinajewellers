/*
 * Al-Madina Jewellers service worker.
 *
 * Deliberately small. Its one job is to show a useful page when there is no
 * connection, which is what an installed app needs and what Google Play
 * expects of a web app it lists.
 *
 * It caches nothing else. Rates, prices and stock change through the day, and
 * a cached page quoting yesterday's gold rate would be worse than no page at
 * all — so every page still comes from the network, and only when the network
 * fails does the offline page stand in.
 *
 * Bump VERSION when offline.html or its icon changes, so installed copies
 * replace the old one.
 */
const VERSION = "v1";
const CACHE = `almadina-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: "reload" so a stale HTTP copy is never what gets stored.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("almadina-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      // Navigation preload starts the page request while the worker boots,
      // so having a worker never makes a page slower to arrive.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // The offline page's own icon, served from the cache so the page is whole
  // when there is no connection. The cache is only the fallback.
  const url = new URL(request.url);
  if (
    request.mode !== "navigate" &&
    url.origin === self.location.origin &&
    PRECACHE.includes(url.pathname)
  ) {
    event.respondWith(fetch(request).catch(() => caches.match(url.pathname)));
    return;
  }

  // Otherwise only page loads. Scripts, images, the database and the rate
  // feed pass straight through untouched.
  if (request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(request);
      } catch {
        const cache = await caches.open(CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return (
          offline ??
          new Response("You are offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }
    })(),
  );
});
