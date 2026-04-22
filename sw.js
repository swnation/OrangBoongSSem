const CACHE_NAME = 'orangi-health-v99u';
const PRECACHE = [
  './index.html',
  './style.css',
  './js/constants.js',
  './js/storage.js',
  './js/firebase-init.js',
  './js/firebase-auth.js',
  './js/firebase-store.js',
  './js/state.js',
  './js/utils.js',
  './js/crypto.js',
  './js/drive.js',
  './js/cost.js',
  './js/ai-api.js',
  './js/session.js',
  './js/head-diagram.js',
  './js/log.js',
  './js/conditions.js',
  './js/checkup.js',
  './js/bungruki.js',
  './js/settings.js',
  './js/pwa.js',
  './js/views.js',
  './icons/head-front.png',
  './icons/head-back.png',
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
    .then(() => self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage({type:'SW_UPDATED'}))))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache: Google auth/API, AI APIs, ntfy, any google domain
  if (url.hostname.includes('google') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('anthropic') ||
      url.hostname.includes('openai') ||
      url.hostname.includes('x.ai') ||
      url.hostname.includes('perplexity') ||
      url.hostname.includes('ntfy')) {
    return;
  }

  // Network-first for HTML/CSS/JS (get latest, fallback to cache)
  if (e.request.destination === 'document' || url.pathname.endsWith('.css') || url.pathname.endsWith('.html') || url.pathname.endsWith('.js')) {
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
