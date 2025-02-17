const CACHE_NAME = 'weather-tracker-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/manifest.json',
    '/images/icons/icon-72x72.png',
    '/images/icons/icon-96x96.png',
    '/images/icons/icon-128x128.png',
    '/images/icons/icon-144x144.png',
    '/images/icons/icon-152x152.png',
    '/images/icons/icon-192x192.png',
    '/images/icons/icon-384x384.png',
    '/images/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    '/offline.html'
];

const OFFLINE_FALLBACK = {
    weather: {
        name: "Offline Mode",
        main: {
            temp: "--",
            humidity: "--"
        },
        weather: [{
            description: "Weather data unavailable offline"
        }],
        wind: {
            speed: "--"
        }
    }
};

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ])
    );
});

// Fetch Event Strategy
self.addEventListener('fetch', (event) => {
    // Handle API requests
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(DYNAMIC_CACHE)
                        .then(cache => {
                            cache.put(event.request.url, response.clone());
                            return response;
                        });
                })
                .catch(() => {
                    return caches.match(event.request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            // Return offline fallback for API requests
                            if (event.request.url.includes('weather')) {
                                return new Response(
                                    JSON.stringify(OFFLINE_FALLBACK.weather),
                                    { headers: { 'Content-Type': 'application/json' } }
                                );
                            }
                        });
                })
        );
        return;
    }

    // Handle static assets
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Background Sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-location') {
        event.waitUntil(
            // Sync stored location data when online
            syncLocationData()
        );
    }
});

// Push Notification Event
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New Update Available',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Details',
                icon: '/images/icons/icon-96x96.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/images/icons/icon-96x96.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Weather & Location Tracker', options)
    );
});
