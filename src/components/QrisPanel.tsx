import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'
import BuktiImage from './ui/BuktiImage'

interface QrisRow {
  id: number
  gambar_url: string | null
  keterangan: string | null
}

// --- Tampilan untuk warga (di halaman Langganan) -----------------
export function QrisView() {
  const [row, setRow] = useState<QrisRow | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('pengaturan_qris')
      .select('id, gambar_url, keterangan')
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) setRow(data as QrisRow)
      })
    return () => {
      alive = false
    }
  }, [])

  if (!row?.gambar_url) return null
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title">
        <span className="mat-icon">qr_code_2</span> Cara Bayar Langganan
      </div>
      <p className="li-sub" style={{ marginBottom: 8, lineHeight: 1.5 }}>
        Scan QRIS di bawah lalu transfer, kemudian kembali ke menu Langganan dan unggah bukti transfer.
      </p>
      <BuktiImage path={row.gambar_url} bucket="qris-platform" maxHeight={220} alt="QRIS pembayaran" />
      {row.keterangan ? (
        <p className="li-sub" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
          {row.keterangan}
        </p>
      ) : null}
    </div>
  )
}

// --- Editor utk Super Admin (di menu Kelola Perumahan) ----------
export function QrisAdminCard() {
  const [row, setRow] = useState<QrisRow | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [keterangan, setKeterangan] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    supabase
      .from('pengaturan_qris')
      .select('id, gambar_url, keterangan')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRow(data as QrisRow)
          setKeterangan((data as QrisRow).keterangan ?? '')
        }
      })
  }
  useEffect(() => {
    load()
  }, [])

  const simpan = async () => {
    setSaving(true)
    try {
      let path = row?.gambar_url ?? null
      if (file) {
        const pth = `qris-${Date.now()}.png`
        const up = await supabase.storage.from('qris-platform').upload(pth, file, {
          contentType: file.type || 'image/png',
          upsert: true,
        })
        if (up.error) throw up.error
        path = up.data.path
      }
      const { error } = await supabase
        .from('pengaturan_qris')
        .upsert({ id: 1, gambar_url: path, keterangan: keterangan.trim() || null, updated_at: new Date().toISOString() })
      if (error) throw error
      showToast('QRIS pembayaran disimpan ✅', 'success')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Gagal menyimpan QRIS', 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title">
        <span className="mat-icon">qr_code_2</span>
        <span style={{ fontWeight: 700 }}>QRIS Pembayaran Langganan</span>
      </div>
      <p className="li-sub" style={{ marginBottom: 8 }}>
        Unggah gambar QRIS Livin kamu di sini. QRIS ini akan tampil di halaman "Langganan" semua perumahan supaya
        warga bisa membayar langsung.
      </p>
      {row?.gambar_url && (
        <div style={{ maxWidth: 260, marginBottom: 10 }}>
          <BuktiImage path={row.gambar_url} bucket="qris-platform" maxHeight={200} alt="QRIS saat ini" />
        </div>
      )}
      <label className="form-label">Ganti gambar QRIS (opsional)</label>
      <input
        type="file"
        accept="image/*"
        className="form-control"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="form-group" style={{ marginTop: 10 }}>
        <label className="form-label">Keterangan tampil (mis. nama penerima / nomor)</label>
        <input className="form-control" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="mis. Denaya — QRIS Livin" />
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={simpan} disabled={saving}>
          {saving ? '⏳' : '💾 Simpan QRIS'}
        </button>
      </div>
    </div>
  )
}