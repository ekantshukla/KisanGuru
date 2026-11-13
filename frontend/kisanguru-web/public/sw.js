// KisanGuru service worker: makes the site installable ("Get app") and opens it offline with the last saved pages.
// Pages: network first, saved copy when offline. API data (/api) always comes from the network.
const CACHE = 'kisanguru-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === 'navigate' || /\.(js|css|png|svg|woff2?|webmanifest)$/.test(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? './' : req).then((r) => r || caches.match('./')))
  );
});
