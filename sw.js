const CACHE_NAME = 'ditherlab-v8-20260401';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/constants.js',
  './js/core/EventBus.js',
  './js/core/State.js',
  './js/algorithms.js',
  './js/metrics.js',
  './js/export.js',
  './js/ui.js',
  './js/processing/AlgorithmRegistry.js',
  './js/processing/AlgorithmBase.js',
  './js/media/MediaManager.js',
  './js/export/ExportManager.js',
  './js/ui/UIController.js',
  './js/palette/PaletteGenerator.js',
  './js/timeline/TimelineManager.js',
  './js/app.js',
  './js/pwa.js',
  './js/main.js',
  './manifest.json',
  './js/gif.worker.js',
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});
