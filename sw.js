const CACHE_NAME = 'ditherlab-v8-algos-20260401';
const urlsToCache = [
  './', './index.html', './css/styles.css',
  './js/constants.js', './js/core/EventBus.js', './js/core/State.js',
  './js/algorithms.js', './js/metrics.js', './js/export.js', './js/ui.js',
  './js/processing/AlgorithmRegistry.js', './js/processing/AlgorithmBase.js',
  './js/media/MediaManager.js', './js/export/ExportManager.js', './js/ui/UIController.js',
  './js/palette/PaletteGenerator.js', './js/timeline/TimelineManager.js',
  './js/app.js', './js/pwa.js', './js/main.js',
  './manifest.json', './js/gif.worker.js',
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)).then(() => self.skipWaiting())); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ns => Promise.all(ns.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
