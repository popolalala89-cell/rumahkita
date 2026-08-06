import { useState } from 'react'
import type { CSSProperties } from 'react'

// Lightbox: tampilan gambar layar penuh + tombol Download.
// Unduh pakai blob supaya andal di browser HP (iOS/Chrome).
export default function Lightbox({
  open,
  src,
  fileName,
  onClose,
}: {
  open: boolean
  src: string | null
  fileName?: string
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  if (!open) return null

  const download = async () => {
    if (!src) return
    setBusy(true)
    try {
      const res = await fetch(src, { mode: 'cors' })
      const blob = await res.blob()
      const obj = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = obj
      a.download = fileName || 'gambar.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(obj)
    } catch {
      window.open(src, '_blank')
    } finally {
      setBusy(false)
    }
  }

  const btnStyle: CSSProperties = {
    background: '#ffffff',
    color: '#111',
    border: 'none',
    borderRadius: 24,
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.93)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 10 }}>
        <button style={btnStyle} onClick={(e) => void (e.stopPropagation(), download())} disabled={busy}>
          {busy ? 'Memproses…' : '⬇️ Download'}
        </button>
        <button style={btnStyle} onClick={(e) => void (e.stopPropagation(), onClose())}>
          ✕ Tutup
        </button>
      </div>
      <img
        src={src || undefined}
        alt="gambar"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '86vh',
          objectFit: 'contain',
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  )
}