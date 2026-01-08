const CACHE_NAME = 'klaim-drive-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/main.tsx',
    '/src/App.tsx',
    '/src/index.css'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch Strategy: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip API calls from caching
    if (event.request.url.includes('/api/')) {
        return fetch(event.request);
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response
                const responseToCache = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Push Notification Handler
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'KLAIM Drive Notification';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/pwa-icon-192.png',
        badge: '/badge-icon.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'open', title: 'Open', icon: '/open-icon.png' },
            { action: 'close', title: 'Close', icon: '/close-icon.png' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data || '/')
        );
    }
});

// Background Sync (for offline uploads)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-uploads') {
        event.waitUntil(syncUploads());
    }
});

async function syncUploads() {
    // Retrieve pending uploads from IndexedDB and sync
    console.log('[SW] Syncing pending uploads...');
    // Implementation would go here
}
