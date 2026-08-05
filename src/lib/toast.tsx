import { useEffect, useState } from 'react'

/** Toast sederhana via CustomEvent — bebas dari library. */
export type ToastType = 'success' | 'danger' | 'info' | 'warning'

export function showToast(message: string, type: ToastType = 'info') {
  window.dispatchEvent(new CustomEvent('rk:toast', { detail: { message, type } }))
}

export function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([])

  useEffect(() => {
    let counter = 0
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as { message: string; type: ToastType }
      const id = ++counter
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
    }
    window.addEventListener('rk:toast', handler)
    return () => window.removeEventListener('rk:toast', handler)
  }, [])

  return (
    <div id="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-notif toast-${t.type}`}>
          <span>
            {t.type === 'success' ? '✅ ' : t.type === 'danger' ? '⚠️ ' : t.type === 'warning' ? '⚠️ ' : 'ℹ️ '}
            {t.message}
          </span>
          <button className="toast-close" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
