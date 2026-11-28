/* impronta · service worker
   Rete prima, sempre: quando sei online l'app scarica i file più recenti (mai la versione vecchia in cache);
   quando sei offline usa l'ultima copia salvata. Solo i file dell'app (stesso indirizzo), nient'altro. */
const CACHE = "impronta-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r, { cache: "no-store" });
      if (res.ok){ const c = await caches.open(CACHE); c.put(r, res.clone()); }
      return res;
    } catch (err){
      const hit = await caches.match(r, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
