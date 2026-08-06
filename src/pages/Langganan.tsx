import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { showToast } from '../lib/toast'
import Modal from '../components/ui/Modal'
import BuktiImage from '../components/ui/BuktiImage'
import type { PermintaanLangganan } from '../lib/types'

export default function LanggananPage() {
  const { profile, perumahan, hasRole } = useAuth()
  const [list, setList] = useState<PermintaanLangganan[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [catatan, setCatatan] = useState('')
  const [busy, setBusy] = useState(false)

  const canRequest = profile ? hasRole('ketua', 'bendahara', 'sekretaris', 'super_admin') : false

  const load = async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('permintaan_langganan')
      .select('*')
      .eq('perumahan_id', profile.perumahan_id)
      .order('dibuat_pada', { ascending: false })
    if (data) setList(data as PermintaanLangganan[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const kirim = async () => {
    if (!profile) return
    if (!file) {
      showToast('Unggah bukti transfer dulu', 'danger')
      return
    }
    setBusy(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
      const pth = `${profile.perumahan_id}/${Date.now()}-${safe}`
      const up = await supabase.storage.from('bukti-langganan').upload(pth, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })
      if (up.error) throw up.error
      const { error } = await supabase.from('permintaan_langganan').insert({
        perumahan_id: profile.perumahan_id,
        pemohon_id: profile.id,
        bukti_url: up.data.path,
        catatan: catatan.trim() || null,
      })
      if (error) throw error
      showToast('Permintaan langganan terkirim ✅', 'success')
      setOpen(false)
      setFile(null)
      setCatatan('')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Gagal mengirim permintaan', 'danger')
    } finally {
      setBusy(false)
    }
  }

  if (!profile || !perumahan) return <div className="page-card">Memuat…</div>

  const until = perumahan.langganan_hingga ? new Date(perumahan.langganan_hingga + 'T23:59:59') : null
  const expired = until ? until < new Date() : false
  const statusLab = !perumahan.langganan_hingga ? 'Tanpa batas' : expired ? 'Kadaluarsa' : 'Aktif'
  const statusCls = !perumahan.langganan_hingga ? 'badge-gray' : expired ? 'badge-amber' : 'badge-green'
  const untilTxt = perumahan.langganan_hingga
    ? new Date(perumahan.langganan_hingga).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div>
      <div className="page-card">
        <div className="card-title">
          <span className="mat-icon">card_membership</span> Langganan Perumahan
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span className={`badge ${statusCls}`}>{statusLab}</span>
          {untilTxt && <span className="li-sub">{untilTxt}</span>}
        </div>
        <p className="li-sub" style={{ marginTop: 10, lineHeight: 1.5 }}>
          Bayar iuran langganan lewat QRIS ke pengelola, lalu kirim bukti transfer melalui tombol di bawah. Pembayaran
          dicek oleh admin dan mengaktifkan layanan perumahan ini.
        </p>
        {canRequest && (
          <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
            <span className="mat-icon">upload</span> Berlangganan / Perpanjang
          </button>
        )}
      </div>

      <div className="page-card">
        <div className="card-title">
          <span className="mat-icon">receipt_long</span> Riwayat Permintaan
        </div>
        {loading ? (
          <p className="li-sub">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="li-sub">Belum ada permintaan.</p>
        ) : (
          list.map((r) => (
            <div className="list-item" key={r.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${r.status === 'menunggu' ? 'badge-blue' : r.status === 'diterima' ? 'badge-green' : 'badge-red'}`}>
                  {r.status === 'menunggu' ? 'Menunggu' : r.status === 'diterima' ? 'Diterima' : 'Ditolak'}
                </span>
                <span className="li-sub">
                  {new Date(r.dibuat_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {r.catatan && <p className="li-sub" style={{ whiteSpace: 'pre-wrap' }}>{r.catatan}</p>}
              <BuktiImage path={r.bukti_url} />
            </div>
          ))
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Kirim Bukti Langganan"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setOpen(false)} disabled={busy}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={kirim} disabled={busy}>
              {busy ? 'Mengirim…' : 'Kirim'}
            </button>
          </>
        }
      >
        <p className="li-sub" style={{ marginBottom: 12, lineHeight: 1.5 }}>
          Transfer ke nomor QRIS pengelola, lalu lampirkan <b>screenshot bukti transfer</b>. Admin akan memverifikasi.
        </p>
        <label className="form-label">Bukti transfer (foto)</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="form-control"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Catatan (opsional)</label>
          <textarea
            className="form-control"
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: Bukti perpanjangan bulanan"
          />
        </div>
      </Modal>
    </div>
  )
}