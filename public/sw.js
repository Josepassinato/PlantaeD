const CACHE_NAME = 'planta3d-v7';
const PRECACHE = [
  '/',
  '/style.css',
  '/event-bus.js',
  '/local-storage.js',
  '/data-model.js',
  '/floor-manager.js',
  '/undo-manager.js',
  '/canvas-interaction.js',
  '/hit-testing.js',
  '/furniture-catalog.js',
  '/material-system.js',
  '/furniture-icons.js',
  '/furniture-models-3d.js',
  '/canvas-renderer.js',
  '/plugin-manager.js',
  '/material-editor.js',
  '/image-reference.js',
  '/pdf-export.js',
  '/three-scene.js',
  '/floor-plan.js',
  '/controls.js',
  '/walkthrough.js',
  '/annotations.js',
  '/editor-2d.js',
  '/cost-estimator.js',
  '/share-manager.js',
  '/measurements.js',
  '/smart-wizard.js',
  '/onboarding.js',
  '/theme-manager.js',
  '/app.js',
  '/ux-enhancements.js',
  '/touch-gestures.js',
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

// Network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If navigating, return the cached index page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
