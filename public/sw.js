const CACHE_NAME = 'planta3d-v5';
const PRECACHE = [
  '/',
  '/style.css',
  '/event-bus.js',
  '/data-model.js',
  '/undo-manager.js',
  '/canvas-interaction.js',
  '/hit-testing.js',
  '/furniture-catalog.js',
  '/material-system.js',
  '/furniture-icons.js',
  '/furniture-models-3d.js',
  '/canvas-renderer.js',
  '/plugin-manager.js',
  '/three-scene.js',
  '/floor-plan.js',
  '/controls.js',
  '/annotations.js',
  '/editor-2d.js',
  '/app.js',
  '/ux-enhancements.js',
  '/OrbitControls.js',
  'https://unpkg.com/three@0.152.2/build/three.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
