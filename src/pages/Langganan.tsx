import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { showToast } from '../lib/toast'
import Modal from '../components/ui/Modal'
import BuktiImage from '../components/ui/BuktiImage'
import { QrisView } from '../components/QrisPanel'
import { formatRp } from '../lib/format'
import type { PermintaanLangganan, PaketLangganan } from '../lib/types'

export default function LanggananPage() {
  const { profile, perumahan, hasRole } = useAuth()
  const [list, setList] = useState<PermintaanLangganan[]>([])
  const [pakets, setPakets] = useState<PaketLangganan[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [pilih, setPilih] = useState<number | null>(null)
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

  useEffect(() => {
    supabase
      .from('paket_langganan')
      .select('*')
      .eq('aktif', true)
      .order('harga', { ascending: true })
      .then(({ data }) => {
        if (data) setPakets(data as PaketLangganan[])
      })
  }, [])

  const kirim = async () => {
    if (!profile) return
    if (!pilih) {
      showToast('Pilih paket dulu', 'danger')
      return
    }
    if (!file) {
      showToast('Unggah bukti transfer dulu', 'danger')
      return
    }
    const paket = pakets.find((p) => p.id === pilih)
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
        paket_id: pilih,
        nominal: paket?.harga ?? null,
      })
      if (error) throw error
      showToast(`Permintaan terkirim ✅ (${paket?.nama ?? ''})`, 'success')
      setOpen(false)
      setPilih(null)
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
      <QrisView />
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
        {pakets.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p className="li-sub" style={{ fontWeight: 700, marginBottom: 4 }}>
              Daftar Paket &amp; Harga
            </p>
            {pakets.map((p) => (
              <div
                key={p.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {p.nama} <span className="li-sub">({p.durasi_hari} hari)</span>
                </span>
                <b style={{ fontSize: '0.85rem' }}>{formatRp(p.harga)}</b>
              </div>
            ))}
          </div>
        )}
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
              {r.invoice_no && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{r.invoice_no}</span>
                  {r.nominal != null && <span className="li-sub">{formatRp(r.nominal)}</span>}
                </div>
              )}
              {r.catatan && <p className="li-sub" style={{ whiteSpace: 'pre-wrap' }}>{r.catatan}</p>}
              <BuktiImage path={r.bukti_url} />
            </div>
          ))
        )}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setPilih(null)
        }}
        title="Berlangganan / Perpanjang"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => {
                setOpen(false)
                setPilih(null)
              }}
              disabled={busy}
            >
              Batal
            </button>
            <button className="btn btn-primary" onClick={kirim} disabled={busy}>
              {busy ? 'Mengirim…' : 'Kirim Permintaan'}
            </button>
          </>
        }
      >
        <p className="li-sub" style={{ marginBottom: 12, lineHeight: 1.5 }}>
          Transfer ke nomor QRIS pengelola sesuai paket pilihan, lalu lampirkan <b>screenshot bukti transfer</b>. Admin
          akan memverifikasi.
        </p>
        <label className="form-label">Pilih paket</label>
        {pakets.map((p) => (
          <label
            key={p.id}
            className="list-item"
            style={{ cursor: 'pointer', gap: 10, marginBottom: 6, border: pilih === p.id ? '1px solid #034BB9' : '1px solid #eee', borderRadius: 10 }}
          >
            <input type="radio" name="paket" checked={pilih === p.id} onChange={() => setPilih(p.id)} />
            <span style={{ flex: 1 }}>
              <b style={{ fontSize: '0.85rem' }}>{p.nama}</b>{' '}
              <span className="li-sub">({p.durasi_hari} hari)</span>
            </span>
            <b style={{ fontSize: '0.85rem' }}>{formatRp(p.harga)}</b>
          </label>
        ))}
        <label className="form-label" style={{ marginTop: 12 }}>
          Bukti transfer (foto)
        </label>
        <input
          type="file"
          accept="image/*"
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