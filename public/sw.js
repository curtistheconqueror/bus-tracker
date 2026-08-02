const CACHE_NAME = "pace-bus-tracker-shell-v1";
const CORE_FILES = ["/manifest.webmanifest", "/favicon.svg"];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const page = await fetch(new Request("/", { cache: "reload" }));
  if (page.ok) {
    await cache.put("/", page.clone());
    const html = await page.text();
    const assets = [...html.matchAll(/(?:href|src)="(\/assets\/[^"?#]+(?:\?[^"#]*)?)"/g)].map(match => match[1]);
    await Promise.allSettled([...new Set([...CORE_FILES, ...assets])].map(async url => {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) await cache.put(url, response);
    }));
  }
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
        if (response.ok) (await caches.open(CACHE_NAME)).put("/", response.clone());
        return response;
      } catch {
        return (await caches.match("/")) || Response.error();
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