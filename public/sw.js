/* Blackout Protocol service worker: precache the app shell, then serve offline. */
const CACHE = 'blackout-protocol-v1';
const scope = self.registration.scope;

async function precache() {
  const cache = await caches.open(CACHE);
  const urls = new Set(['./', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'].map((u) => new URL(u, scope).href));
  const html = await (await fetch(new URL('./', scope), { cache: 'reload' })).text();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], scope);
    if (u.origin === location.origin) urls.add(u.href);
  }
  // Pull fonts / images referenced from the CSS bundles.
  for (const u of [...urls].filter((x) => x.endsWith('.css'))) {
    const css = await (await fetch(u, { cache: 'reload' })).text();
    for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
      const raw = m[1].replace(/["']/g, '');
      if (raw.startsWith('data:')) continue;
      urls.add(new URL(raw, u).href);
    }
  }
  await Promise.all([...urls].map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Network first so updates arrive, fall back to the cached shell offline.
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(new URL('./', scope).href, copy));
        return res;
      }).catch(() => caches.match(new URL('./', scope).href, { ignoreVary: true }).then((r) => r || Response.error())),
    );
    return;
  }
  // Static assets: cache first, refresh in background.
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
