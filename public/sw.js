// Service Worker for Sports Betting Arbitrage Platform
// Provides offline functionality and caching strategies

const CACHE_NAME = 'sports-arbitrage-v1';
const STATIC_CACHE_NAME = 'sports-arbitrage-static-v1';
const DYNAMIC_CACHE_NAME = 'sports-arbitrage-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/pricing',
  '/demo',
  '/demo-dashboard',
  '/demo-arbitrage',
  '/demo-calculator',
  '/demo-portfolio',
  '/offline',
  // Static assets
  '/favicon.ico',
  '/manifest.json',
  // Add critical CSS and JS files here
];

// API endpoints that can be cached
const CACHEABLE_APIS = [
  '/api/odds',
  '/api/optimized-odds',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (request.destination === 'document') {
    // HTML pages - Network First with Cache Fallback
    event.respondWith(handlePageRequest(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API requests - Cache First for cacheable APIs, Network Only for others
    event.respondWith(handleApiRequest(request));
  } else if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script') {
    // Static assets - Cache First
    event.respondWith(handleStaticAssetRequest(request));
  } else {
    // Default strategy - Network First
    event.respondWith(handleDefaultRequest(request));
  }
});

// Network First strategy for HTML pages
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If demo pages, return offline page
    if (request.url.includes('/demo')) {
      return caches.match('/demo');
    }
    
    // Return offline page for other routes
    return caches.match('/offline') || new Response('Offline - Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API endpoint is cacheable
  const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
  
  if (isCacheable && request.method === 'GET') {
    // Cache First strategy for GET requests to cacheable APIs
    try {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Return cached version and update in background
        updateApiCache(request);
        return cachedResponse;
      }
      
      // Not in cache, fetch from network
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Return cached version if network fails
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  } else {
    // Network Only for non-cacheable APIs or non-GET requests
    return fetch(request);
  }
}

// Cache First strategy for static assets
async function handleStaticAssetRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Error handling static asset:', error);
    throw error;
  }
}

// Default Network First strategy
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Background update for API cache
async function updateApiCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.log('Service Worker: Background API update failed:', error);
  }
}

// Handle background sync (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // For example, sync pending bets or user data
  console.log('Service Worker: Performing background sync...');
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New arbitrage opportunity available!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.url || '/',
      actions: [
        {
          action: 'view',
          title: 'View Opportunity'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Sports Arbitrage', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    const url = event.notification.data || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

console.log('Service Worker: Script loaded');