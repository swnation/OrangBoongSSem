const CACHE_NAME = 'orangi-health-v9a';
const PRECACHE = [
  './index.html',
  './quick.html',
  './quick-manifest.json',
  './style.css',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Sans+KR:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
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

  // Never cache API calls (Google Drive, AI APIs)
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('openai.com') ||
      url.hostname.includes('generativelanguage.googleapis.com') ||
      url.hostname.includes('perplexity.ai') ||
      url.hostname.includes('accounts.google.com')) {
    return;
  }

  // Network-first for HTML/CSS (get latest, fallback to cache)
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

  // Cache-first for static assets (fonts, CDN libs)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', {status:503, statusText:'Service Unavailable'}));
    })
  );
});
