const CACHE_NAME = 'orangi-quick-v5';
const PRECACHE = [
  './',
  '../style.css',
  'https://cdn.jsdelivr.net/npm/marked@15/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('google') || url.hostname.includes('gstatic') ||
      url.hostname.includes('googleapis') || url.hostname.includes('script') ||
      url.hostname.includes('anthropic') || url.hostname.includes('openai') ||
      url.hostname.includes('perplexity') || url.hostname.includes('ntfy')) {
    return;
  }
  if (e.request.destination === 'document' || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
