import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Menampilkan gambar dari storage private lewat link sementara (1 jam)
export default function BuktiImage({
  path,
  alt,
  maxHeight = 180,
  bucket = 'bukti-langganan',
}: {
  path: string | null
  alt?: string
  maxHeight?: number
  bucket?: string
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (!path) {
      setUrl(null)
      return
    }
    setUrl(null)
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive && data?.signedUrl) setUrl(data.signedUrl)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [path, bucket])

  if (!path) return <span className="li-sub">(tanpa gambar)</span>
  if (!url) return <span className="li-sub">memuat…</span>
  return (
    <img
      src={url}
      alt={alt || 'gambar'}
      style={{ width: '100%', maxHeight, objectFit: 'cover', borderRadius: 10, background: '#fff' }}
    />
  )
}