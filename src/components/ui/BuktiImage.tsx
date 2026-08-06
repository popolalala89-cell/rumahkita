import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Menampilkan gambar bukti dari storage private lewat link sementara (1 jam)
export default function BuktiImage({ path, alt, maxHeight = 180 }: { path: string | null; alt?: string; maxHeight?: number }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (!path) {
      setUrl(null)
      return
    }
    setUrl(null)
    supabase.storage
      .from('bukti-langganan')
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive && data?.signedUrl) setUrl(data.signedUrl)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [path])

  if (!path) return <span className="li-sub">(tanpa bukti)</span>
  if (!url) return <span className="li-sub">memuat…</span>
  return (
    <img
      src={url}
      alt={alt || 'bukti'}
      style={{ width: '100%', maxHeight, objectFit: 'cover', borderRadius: 10, background: '#fff' }}
    />
  )
}