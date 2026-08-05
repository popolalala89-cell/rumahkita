/* RumahKita — Service Worker (PWA)
   Strategi:
   - Install: precache shell (index.html di subpath /rumahkita/).
   - Navigasi SPA: network-first; kalau server jawab 404 (route SPA) atau offline,
     pakai shell dari cache. Browser URL tetap di path yang diminta.
   - Aset same-origin (has = immutable): cache-first, isi cache saat pertama diambil.
*/
'use strict'
const CACHE = 'rumahkita-v2'
const SHELL = ['/rumahkita/index.html', '/rumahkita/manifest.webmanifest']

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

  // Navigasi halaman (termasuk route /rumahkita/app/...): network first,
  // 404 server (route SPA) & offline → shell dari cache
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then((res) => {
        if (res.ok) return res
        return caches.match('/rumahkita/index.html').then((hit) => hit || fetch('/rumahkita/index.html'))
      }).catch(() => caches.match('/rumahkita/index.html'))
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
        }).catch(() => caches.match('/rumahkita/index.html'))
      )
    )
  }
})
