/* Pad Shapes service worker – cache-first, versioned.
   Bump VERSION whenever any cached file changes, or phones will keep the
   old copy. The new worker then installs in the background, takes over,
   and the page offers a reload. */
const VERSION = 'v5';
const CACHE = `pad-shapes-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './fonts/instrument-sans-latin.woff2',
  './fonts/noto-music-accidentals.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' skips the HTTP cache, so a new version never caches stale files.
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('pad-shapes-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    // Read with caches.match, not caches.open: an old worker finishing its
    // last requests must not re-create the cache the new one just deleted.
    const hit = req.mode === 'navigate'
      ? await caches.match('./index.html', { cacheName: CACHE })   // index.html?test too
      : await caches.match(req, { cacheName: CACHE, ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type === 'basic' && await caches.has(CACHE)) {
      (await caches.open(CACHE)).put(req, res.clone());
    }
    return res;
  })());
});
