import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth'

// GitHub Pages SPA fallback: restore URL yang disimpan 404.html
;(function () {
  const redirect = sessionStorage.getItem('redirect')
  if (redirect && redirect !== location.href) {
    sessionStorage.removeItem('redirect')
    history.replaceState(null, '', redirect)
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
