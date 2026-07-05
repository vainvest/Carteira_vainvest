// ValorInvest Service Worker — permite funcionamento offline
const CACHE_NAME = 'valorinvest-v6';
const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // Continua mesmo se algum recurso externo falhar ao cachear
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cotações da API: tenta rede primeiro, sem fallback a cache (dados têm de ser frescos)
  if (event.request.url.includes('finance.yahoo.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({error: 'offline'})))
    );
    return;
  }

  // Resto dos recursos: cache primeiro, depois rede
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    }).catch(() => {
      return caches.match('./index.html');
    })
  );
});
