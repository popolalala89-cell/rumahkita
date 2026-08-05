/* RumahKita — Service Worker (PWA)
   Strategi:
   - Install: precache shell (index.html).
   - Navigasi SPA: network-first, fallback ke index.html (offline tetap jalan di dalam app).
   - Aset same-origin (has = immutable): cache-first, isi cache saat pertama diambil.
*/
'use strict'
const CACHE = 'rumahkita-v1'
const SHELL = ['/', '/index.html']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Navigasi halaman (termasuk route /app/...): network first, fallback shell
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Aset static same-origin: cache first (has = immutable, otomatis fresh saat versi baru)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
          }
          return res
        }).catch(() => caches.match('/index.html'))
      )
    )
  }
})