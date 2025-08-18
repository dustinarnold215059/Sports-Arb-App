/**
 * Service Worker for Push Notifications
 * Handles background notification delivery and actions
 */

const CACHE_NAME = 'sports-betting-notifications-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    return;
  }

  const { title, message, data = {}, priority = 'medium', actions = [] } = notificationData;

  const options = {
    body: message,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.type || 'default',
    data: data,
    requireInteraction: priority === 'urgent',
    actions: actions.map(action => ({
      action: action.id,
      title: action.label
    })),
    vibrate: priority === 'high' || priority === 'urgent' ? [200, 100, 200] : [100],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  const { notification, action } = event;
  const data = notification.data || {};

  event.notification.close();

  // Handle different actions
  if (action) {
    event.waitUntil(handleNotificationAction(action, data));
  } else {
    // Default action - open the app
    event.waitUntil(openApp(data));
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  
  // Track dismissal analytics
  const data = event.notification.data || {};
  if (data.trackDismissal) {
    // Send analytics data
    fetch('/api/analytics/notification-dismissed', {
      method: 'POST',
      body: JSON.stringify({
        notificationId: data.id,
        type: data.type,
        timestamp: Date.now()
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(err => console.error('[SW] Failed to track dismissal:', err));
  }
});

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncPendingNotifications());
  }
});

// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'SHOW_NOTIFICATION':
      showLocalNotification(payload);
      break;
    case 'CLEAR_NOTIFICATIONS':
      clearNotifications(payload.tag);
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Helper functions
async function handleNotificationAction(action, data) {
  console.log('[SW] Handling action:', action, data);
  
  switch (action) {
    case 'open_calculator':
      return openApp({ page: '/arbitrage', data: data.opportunity });
    
    case 'place_bet':
      return openApp({ page: '/betting', data: data });
    
    case 'view_details':
      return openApp({ page: '/notifications', notificationId: data.id });
    
    case 'snooze':
      return snoozeNotification(data);
    
    case 'dismiss':
      return markNotificationAsRead(data.id);
    
    default:
      return openApp(data);
  }
}

async function openApp(data = {}) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Check if app is already open
  for (const client of clients) {
    if (client.url.includes(self.location.origin)) {
      // Focus existing window
      await client.focus();
      
      // Send navigation message
      client.postMessage({
        type: 'NOTIFICATION_NAVIGATION',
        payload: data
      });
      
      return;
    }
  }

  // Open new window
  const url = data.page ? `${self.location.origin}${data.page}` : self.location.origin;
  return self.clients.openWindow(url);
}

async function showLocalNotification(payload) {
  const { title, message, options = {} } = payload;
  
  return self.registration.showNotification(title, {
    body: message,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    ...options
  });
}

async function clearNotifications(tag) {
  const notifications = await self.registration.getNotifications({ tag });
  notifications.forEach(notification => notification.close());
}

async function snoozeNotification(data) {
  // Close current notification
  const notifications = await self.registration.getNotifications({ tag: data.type });
  notifications.forEach(notification => notification.close());
  
  // Schedule re-notification (this would typically use a server-side scheduler)
  setTimeout(() => {
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.type,
      data: data
    });
  }, 30 * 60 * 1000); // 30 minutes
}

async function markNotificationAsRead(notificationId) {
  // Send read status to server
  try {
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notificationId }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[SW] Failed to mark notification as read:', error);
  }
}

async function syncPendingNotifications() {
  try {
    const response = await fetch('/api/notifications/pending');
    const notifications = await response.json();
    
    for (const notification of notifications) {
      await self.registration.showNotification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: notification.type,
        data: notification.data
      });
    }
  } catch (error) {
    console.error('[SW] Failed to sync pending notifications:', error);
  }
}

// Handle fetch events for notification-related requests
self.addEventListener('fetch', (event) => {
  // Only handle notification-related API calls
  if (event.request.url.includes('/api/notifications')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline, queue the request for later sync
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

console.log('[SW] Service worker loaded');