/* RumahKita — Service Worker (PWA) v6
   Strategi:
   - Install: precache shell + SEMUA aset (js/css) yang dirujuk index.html
     versi terbaru, jadi shell & bundle selalu konsisten.
   - Navigasi (termasuk route SPA /app/*): network-first. Ambil
     versi index.html terbaru dari server; kalau server 404 (route SPA) tetap
     ambil index.html segar; kalau offline pakai shell yang sudah di-precache.
   - Aset same-origin: cache-first. KALAU GAGAL, jangan mengganti dengan HTML
     (itu penyebab blank putih) — kirim kode gagal supaya browser tidak
     menyalahartikan; app dibantu penjaga boot di index.html.
   - v6: tambah handler push (notifikasi web).
   - Setiap versi baru: installer versi ini, cache lama & SW lama dibuang. */
'use strict'

const VERSION = 'v6'
const CACHE = 'rumahkita-' + VERSION
const BASE = ''
const SHELL = [BASE + '/index.html', BASE + '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(SHELL)
      // Precache semua aset yang dirujuk index.html versi terbaru,
      // sehingga shell & bundle selalu cocok (tidak blank).
      try {
        const idx = await (await fetch(BASE + '/index.html')).text()
        const refs = [...idx.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
          .map((m) => m[1])
          .filter((p) => p.startsWith(BASE))
        await Promise.all(refs.map((p) => cache.add(p).catch(() => {})))
      } catch (e) {}
      self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // --- Navigasi halaman: network-first dengan shell segar ---
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(BASE + '/index.html', clone))
            return res
          }
          // Server 404 (route SPA) → ambil index.html versi terbar, jangan 404.html
          return fetch(BASE + '/index.html')
            .then((r) => {
              const c2 = r.clone()
              caches.open(CACHE).then((c) => c.put(BASE + '/index.html', c2))
              return r
            })
            .catch(() => caches.match(BASE + '/index.html'))
        })
        .catch(() => caches.match(BASE + '/index.html'))
    )
    return
  }

  // --- Aset static same-origin: cache-first ---
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok && res.type === 'basic') {
              const clone = res.clone()
              caches.open(CACHE).then((c) => c.put(request, clone))
            }
            return res
          })
      )
    )
    return
  }

  // --- Font Google / css dll dari domain lain: passthrough saja ---
})

// ── Web Push (notifikasi) ────────────────────────────────────
// Tampilkan notifikasi saat server mengirim pesan push.
self.addEventListener('push', (e) => {
  let data = {}
  try {
    data = e.data ? e.data.json() : {}
  } catch (err) {
    data = { title: 'RumahKita', body: e.data ? e.data.text() : '' }
  }
  const title = data.title || 'RumahKita'
  const options = {
    body: data.body || '',
    icon: BASE + '/icons/app-192.png',
    badge: BASE + '/icons/app-192.png',
    data: { url: data.url || BASE + '/app' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

// Ketuk notifikasi → fokus/buka aplikasi (langsung ke route yang dimaksud).
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || BASE + '/app'
  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ('focus' in c) {
            c.focus()
            if ('navigate' in c) c.navigate(url)
            return c
          }
        }
        return clients.openWindow(url)
      })
      .catch(() => clients.openWindow(url))
  )
})