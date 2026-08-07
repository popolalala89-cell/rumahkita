import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { showToast } from '../lib/toast'

// Panel kirim notifikasi ke SEMUA perangkat terdaftar (khusus Super Admin,
// di menu Kelola Perumahan). Memanggil Supabase Edge Function 'kirim-notif'
// yang menyimpan kunci VAPID private aman di server.
export default function KirimNotifPanel() {
  const { profile } = useAuth()
  const [judul, setJudul] = useState('')
  const [isi, setIsi] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasil, setHasil] = useState<string | null>(null)

  const kirim = async () => {
    if (!judul.trim()) return showToast('Tulis judul notifikasi dulu.', 'warning')
    const perumahan_id = profile?.perumahan_id ?? ''
    if (!perumahan_id) return showToast('Perumahan belum terhubung.', 'danger')
    setBusy(true)
    setHasil(null)
    const { data, error } = await supabase.functions.invoke('kirim-notif', {
      body: { perumahan_id, judul: judul.trim(), isi: isi.trim(), url: '/app' },
    })
    setBusy(false)
    if (error) {
      // error dari transport; detail di data
      const msg = (data as { error?: string })?.error ?? error.message
      showToast('Gagal kirim: ' + msg, 'danger')
      return
    }
    if (data?.ok === false) {
      showToast('Gagal kirim: ' + (data.error ?? 'tidak diketahui'), 'danger')
      return
    }
    const t = data?.terkirim ?? 0
    const g = data?.gagal ?? 0
    setHasil(`Notifikasi terkirim ke ${t} perangkat.${g > 0 ? ` ${g} gagal.` : ''}`)
    showToast(`Terkirim ke ${t} perangkat 🔔`, 'success')
    setJudul('')
    setIsi('')
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>📣</span>
        <div>
          <h3 style={{ margin: 0 }}>Kirim Notifikasi ke Warga</h3>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Broadcast web push ke semua perangkat terdaftar perumahan ini (muncul di layar HP walau app ditutup).
          </div>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">Judul</label>
        <input
          className="form-control"
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          maxLength={80}
          placeholder="Mis. Pengumuman Iuran Bulan Ini"
        />
      </div>

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">Isi pesan</label>
        <textarea
          className="form-control"
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Tulis pesan yang ingin disampaikan ke warga…"
        />
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-primary" onClick={kirim} disabled={busy}>
          {busy ? '⏳ Mengirim…' : '🚀 Kirim ke Semua Warga'}
        </button>
      </div>

      {hasil && (
        <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--success)', display: 'flex', gap: 6 }}>
          <span>✅</span> {hasil}
        </div>
      )}
      {!profile?.perumahan_id && (
        <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--danger)' }}>
          Akun Super Admin belum terhubung ke perumahan mana pun.
        </div>
      )}
    </div>
  )
}