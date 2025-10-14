const CACHE_NAME = 'ditherlab-v7-robust-20251014';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/gif.worker.js',
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache abierta. Intentando cachear archivos individualmente.');
      const promises = urlsToCache.map(url => {
        return fetch(url)
          .then(response => {
            if (!response.ok) {
              // No detiene el proceso, solo loguea el error
              console.error(`Fallo al buscar ${url} para cachear. Status: ${response.status}`);
              return Promise.resolve(); // Resuelve para que Promise.all no falle
            }
            return cache.put(url, response);
          })
          .catch(err => {
            console.error(`Error de red al intentar cachear ${url}:`, err);
          });
      });
      return Promise.all(promises);
    }).then(() => {
      console.log('Todos los recursos solicitados para cacheo.');
      return self.skipWaiting();
    })
  );
});

// El resto de los listeners (fetch, activate) se mantienen igual que en la versión anterior.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});
