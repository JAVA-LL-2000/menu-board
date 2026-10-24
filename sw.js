// Keeps an offline copy of the menu board page and its fonts,
// so the TV still shows the menu if it restarts while the internet is down.
const CACHE = 'menuboard-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'menu.json']).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: use the saved copy first (they never change)
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }

  // This site's own files: try the internet first, fall back to the saved copy
  if (url.origin === location.origin) {
    const key = url.origin + url.pathname; // ignore ?_=timestamp
    e.respondWith(fetch(req).then(res => {
      if (res.ok && !url.searchParams.has('ping')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key)));
  }
  // Anything else (the Google menu link) goes straight to the network; the page keeps its own copy of the menu.
});
