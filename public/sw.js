// Casanova Study service worker (phase 1: installable app + offline page).
// Deliberately small: pages always come from the network, hashed build assets
// are cached, and a failed page load shows /offline.html instead of the
// browser's error screen. API and Supabase requests are never touched.
const VERSION = 'v1'
const STATIC_CACHE = `cs-static-${VERSION}`
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png']))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cs-') && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Content-hashed build output never changes, so cache-first is safe. App
  // icons are cache-first too (the offline page shows one).
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy))
        }
        return res
      }))
    )
  }
})
