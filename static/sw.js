// Service Worker for caching and performance optimization

const CACHE_NAME = 'data-tools-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/app.css',
  '/favicon.svg',
  '/manifest.json',
  '/robots.txt'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip external requests (CDNs, APIs, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Strategy: Cache First for static assets, Network First for dynamic content
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      url.pathname.includes('/assets/')) {
    
    // Cache First for static assets
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            // Serve from cache
            return response;
          }
          
          // Fetch from network and cache
          return fetch(request)
            .then((response) => {
              // Don't cache non-successful responses
              if (!response.ok) {
                return response;
              }
              
              // Clone response for caching
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
              
              return response;
            });
        })
    );
  } else {
    // Network First for dynamic content (pages, API calls)
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response.ok) {
            return response;
          }
          
          // Cache successful responses
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
  }
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  console.log('🔄 Performing background sync...');
  // Add background sync logic here
}

// Push notification support
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Data Tools Update', options)
  );
});

console.log('🌟 Service Worker loaded');
