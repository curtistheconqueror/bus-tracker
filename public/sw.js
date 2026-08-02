const CACHE_NAME = "pace-bus-tracker-shell-v2";
const CORE_FILES = ["/manifest.webmanifest", "/favicon.svg"];
const CORE_PAGES = ["/", "/down-sheet"];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const assets = new Set(CORE_FILES);
  await Promise.all(CORE_PAGES.map(async path => {
    const page = await fetch(new Request(path, { cache: "reload" }));
    if (!page.ok) return;
    await cache.put(path, page.clone());
    const html = await page.text();
    for (const match of html.matchAll(/(?:href|src)="(\/assets\/[^"?#]+(?:\?[^"#]*)?)"/g)) assets.add(match[1]);
  }));
  await Promise.allSettled([...assets].map(async url => {
    const response = await fetch(url, { cache: "reload" });
    if (response.ok) await cache.put(url, response);
  }));
}
self.addEventListener("install", event => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("pace-bus-tracker-shell-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE_NAME)).put(url.pathname, response.clone());
        return response;
      } catch {
        return (await caches.match(url.pathname)) || (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination) || CORE_FILES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
      return response;
    })());
  }
});