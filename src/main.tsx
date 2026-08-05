import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth'
import { APP_BASE } from './lib/config'

// GitHub Pages SPA fallback: restore URL yang disimpan 404.html
;(function () {
  const redirect = sessionStorage.getItem('redirect')
  if (redirect && redirect !== location.href) {
    sessionStorage.removeItem('redirect')
    history.replaceState(null, '', redirect)
  }
})()

// PWA: daftarkan service worker (offline + bisa di-install dari HP)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${APP_BASE}/sw.js`).catch(() => {
      /* offline saja; app tetap jalan normal */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={APP_BASE}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
