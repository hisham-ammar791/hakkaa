// Offline cache for حكّاء (Hakkaa).
// Serves the app from cache (works with no internet) and refreshes the cache in the background,
// so a new version uploaded to the site appears on the next launch.
const CACHE = 'hakkaa-v39';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'fonts/hakkaa-naskh.ttf'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // Google sign-in & Drive go to the network
  // The page asks "index.html?fresh=…" to check for a new version: always go to the network,
  // and store the fresh copy so that a reload shows it at once.
  if (new URL(req.url).searchParams.has('fresh')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(async res => {
        if (res && res.ok) { const c = await caches.open(CACHE); await c.put('index.html', res.clone()); }
        return res;
      }).catch(() => new Response('', { status: 503 }))
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const key = req.mode === 'navigate' ? 'index.html' : req;
      const hit = await cache.match(key, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(key, res.clone());
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || new Response('غير متصل', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })
  );
});
