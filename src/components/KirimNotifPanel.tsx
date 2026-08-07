import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { showToast } from '../lib/toast'

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

// Panel kirim notifikasi web push (dipakai menu "Kirim Notif" utk pengurus &
// menu Kelola Perumahan utk Super Admin). Memanggil Edge Function 'kirim-notif'
// (kunci VAPID private aman di server). Sasaran bisa "semua warga" atau
// "hanya yang belum bayar iuran" (tagihan status 'belum' pada bulan/tahun pilihan).
export default function KirimNotifPanel() {
  const { profile } = useAuth()
  const d = new Date()
  const [judul, setJudul] = useState('')
  const [isi, setIsi] = useState('')
  const [target, setTarget] = useState<'semua' | 'belum_bayar'>('semua')
  const [bulan, setBulan] = useState(d.getMonth() + 1)
  const [tahun, setTahun] = useState(d.getFullYear())
  const [busy, setBusy] = useState(false)
  const [hasil, setHasil] = useState<string | null>(null)

  const kirim = async () => {
    if (!judul.trim()) return showToast('Tulis judul notifikasi dulu.', 'warning')
    const perumahan_id = profile?.perumahan_id ?? ''
    if (!perumahan_id) return showToast('Perumahan belum terhubung.', 'danger')
    setBusy(true)
    setHasil(null)
    const body: Record<string, unknown> = { perumahan_id, judul: judul.trim(), isi: isi.trim(), url: '/app' }
    if (target === 'belum_bayar') {
      body.target = 'belum_bayar'
      body.bulan = bulan
      body.tahun = tahun
    }
    const { data, error } = await supabase.functions.invoke('kirim-notif', { body })
    setBusy(false)
    if (error) {
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
    const sas = data?.sasaran ?? null
    if (target === 'belum_bayar' && sas === 0) {
      setHasil('Tidak ada warga yang belum bayar pada bulan itu — tidak ada yang dikirim. ✅')
      showToast('Semua sudah bayar / belum ada tagihan bulan itu', 'warning')
      return
    }
    const sasTxt = sas !== null && sas !== t ? ` (sasaran ${sas} perangkat)` : ''
    setHasil(`Notifikasi terkirim ke ${t} perangkat${sasTxt}.${g > 0 ? ` ${g} gagal.` : ''}`)
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
            Web push muncul di layar HP walau aplikasi ditutup. Pilih sasaran: semua warga, atau hanya yang belum bayar iuran.
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

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">Sasaran</label>
        <select
          className="form-control"
          value={target}
          onChange={(e) => setTarget(e.target.value as 'semua' | 'belum_bayar')}
        >
          <option value="semua">Semua warga (broadcast)</option>
          <option value="belum_bayar">Hanya yang belum bayar iuran</option>
        </select>
      </div>

      {target === 'belum_bayar' && (
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Bulan tagihan</label>
            <select
              className="form-control"
              value={bulan}
              onChange={(e) => setBulan(parseInt(e.target.value))}
            >
              {NAMA_BULAN.map((b, i) => (
                <option key={b} value={i + 1}>{b}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Tahun</label>
            <input
              className="form-control"
              inputMode="numeric"
              value={tahun}
              onChange={(e) => setTahun(parseInt(e.target.value) || new Date().getFullYear())}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-primary" onClick={kirim} disabled={busy}>
          {busy ? '⏳ Mengirim…' : target === 'belum_bayar' ? '🔔 Kirim Pengingat ke yang Belum Bayar' : '🚀 Kirim ke Semua Warga'}
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