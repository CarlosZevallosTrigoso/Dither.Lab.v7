// (raíz)/sw.js

const CACHE_NAME = 'ditherlab-v7-modular-20251014';

// Lista de archivos a cachear. Las rutas deben coincidir con la nueva estructura.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/gif.worker.js',
  // URLs de librerías externas
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
  // Nota: No cacheamos los módulos JS de /src directamente,
  // ya que el navegador los gestiona a través del import.
  // En un entorno de producción con "bundler", aquí iría el archivo JS compilado.
];

// Evento de instalación: se abre la caché y se guardan los archivos.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Evento fetch: intercepta las peticiones y responde desde la caché si es posible.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en la caché, lo devuelve. Si no, lo busca en la red.
        return response || fetch(event.request);
      })
  );
});

// Evento de activación: limpia las cachés antiguas.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
