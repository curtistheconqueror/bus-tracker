/* Bumped whenever CORE_PAGES changes, AND whenever the CONTENTS of a CORE_FILE
   change. The activate handler deletes every cache under the old name, which is
   the only thing that clears the dead hashed asset files left behind by earlier
   releases — each build renames every chunk, so without a bump the old ones sit
   on the phone forever, never requested and never removed. The cost is one
   re-download of the shell, online, on first launch after an update.

   The contents half of that rule is not theoretical: these files are served
   cache-first and keep their NAMES across releases, unlike the hashed chunks.
   A new icon or a changed manifest under an unbumped name is a file the phone
   already holds and will never ask for again. */
const CACHE_NAME = "pace-bus-tracker-shell-v7";
/* The icons are here so a phone that first opens the app in a bay with no
   signal still has them, and because the fetch handler below serves anything
   in this list cache-first. */
const CORE_FILES = ["/manifest.webmanifest", "/favicon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png"];
/* Every page the app has. Fleet Campaigns was missing until Version 137, so a
   phone that had never opened it while online got nothing when it lost signal
   in a bay — which is the one situation this whole file exists for. Settings
   is a page now too, and one somebody may well open for the first time in a
   bay to turn a theme on.

   INCIDENTS and SHOP TALK are here for a sharper version of the same reason.
   Somebody reaching for the incident form has just been hurt, and somebody
   posting a hazard is standing next to it — neither is going to walk out to
   the yard for signal first, and a blank page at that moment is the report
   never getting written. */
const CORE_PAGES = ["/", "/down-sheet", "/defect-log", "/fixed-repairs", "/lists", "/incidents", "/shop-talk", "/settings"];

/* ONE PAGE OFF THE WIFI MUST NOT COST THE OTHER SEVEN. This loop used to let a
   single rejected fetch out of Promise.all, which rejected the whole install:
   skipWaiting never ran, the worker never activated, and the phone was left
   with no offline shell at all — silently, and in exactly the conditions this
   file exists for, a first launch on garage wifi that drops. The asset loop
   below had been tolerant from the start; the page loop had not, and nothing
   made that asymmetry deliberate.

   `/` IS STILL FATAL, and that is the other half. Every navigation falls back
   to it (see the fetch handler), so a shell without it is not a shell, and a
   failed install is what makes the browser try again on the next load. Swallow
   that too and the worker activates holding nothing and never retries, which
   is worse than failing. */
async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const assets = new Set(CORE_FILES);
  const cachedPages = new Set();
  await Promise.all(CORE_PAGES.map(async path => {
    try {
      const page = await fetch(new Request(path, { cache: "reload" }));
      if (!page.ok) return;
      await cache.put(path, page.clone());
      cachedPages.add(path);
      const html = await page.text();
      for (const match of html.matchAll(/(?:href|src)="(\/assets\/[^"?#]+(?:\?[^"#]*)?)"/g)) assets.add(match[1]);
    } catch {
      /* Left out of this install. The next one picks it up. */
    }
  }));
  if (!cachedPages.has("/")) throw new Error("app shell not cached: / is unreachable");
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