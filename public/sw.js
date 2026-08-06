/* RumahKita — Service Worker (PWA) v4
   Strategi:
   - Install: cache shell + SEMUA aset (js/css) yang dirujuk index.html
     versi terbaru, jadi shell & bundle selalu konsisten (tidak blank).
   - Navigasi SPA: network-first; salinan index.html terbaru disimpan ulang
     ke cache tiap kali diambil. 404 server (route SPA) / offline → shell.
   - Aset same-origin (hash = immutable): cache-first.
   - Cache versi lama dibuang otomatis saat aktivasi. */
'use strict'
const CACHE = 'rumahkita-v4'
const BASE = '/rumahkita'
const SHELL = [BASE + '/index.html', BASE + '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(SHELL)
      // Pra-cache aset yang dirujuk index.html terbaru (biar konsisten)
      try {
        const idx = await (await fetch(BASE + '/index.html')).text()
        const refs = [...idx.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
          .map((m) => m[1])
          .filter((p) => p.startsWith(BASE))
        await cache.addAll(refs)
      } catch {
        /* offline saat install: shell sudah cukup */
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Navigasi halaman (termasuk route /rumahkita/app/...): network-first.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(BASE + '/index.html', clone))
            return res
          }
          // 404 dari server = route SPA → ambil index.html asli
          return fetch(BASE + '/index.html')
            .then((r) => {
              const clone = r.clone()
              caches.open(CACHE).then((c) => c.put(BASE + '/index.html', clone))
              return r
            })
            .catch(() => caches.match(BASE + '/index.html'))
        })
        .catch(() => caches.match(BASE + '/index.html'))
    )
    return
  }

  // Aset static same-origin: cache-first; JANGAN ganti aset gagal dengan HTML
  // (itu penyebab blank putih). Gagal → respons 504 kosong.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              const clone = res.clone()
              caches.open(CACHE).then((c) => c.put(request, clone))
            }
            return res
          })
          .catch(() => new Response('', { status: 504, statusText: 'Aset offline' }))
      )
    )
  }
})