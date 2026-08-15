const CACHE_NAME = 'zatora-cache-v1'

const urlsToCache = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
]

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    )
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            )
        )
    )
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request)
        })
    )
})

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {}

    const title = data.title || 'Zatora'
    const options = {
        body: data.body || 'You have a Zatora reminder.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
    }

    event.waitUntil(
        self.registration.showNotification(title, options)
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    event.waitUntil(
        clients.openWindow('/')
    )
})