import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import { formatRp, formatTanggal } from '../lib/format'
import type { Booking, Fasilitas, Keluhan, Surat, Warga } from '../lib/types'

type Tab = 'keluhan' | 'booking' | 'surat'

const KAT_KELUHAN = ['Kebersihan', 'Keamanan', 'Fasilitas', 'Lampu / Listrik', 'Lainnya']
const JENIS_SURAT = ['Surat Keterangan Domisili', 'Surat Pengantar', 'Surat Keterangan Usaha', 'Keterangan Tinggal', 'Lainnya']

const KELUHAN_BADGE: Record<Keluhan['status'], { cls: string; label: string }> = {
  baru: { cls: 'badge-red', label: 'Baru' },
  diproses: { cls: 'badge-amber', label: 'Diproses' },
  selesai: { cls: 'badge-green', label: 'Selesai' },
}
const BOOKING_BADGE: Record<Booking['status'], { cls: string; label: string }> = {
  menunggu: { cls: 'badge-amber', label: 'Menunggu' },
  disetujui: { cls: 'badge-green', label: 'Disetujui' },
  ditolak: { cls: 'badge-red', label: 'Ditolak' },
  selesai: { cls: 'badge-blue', label: 'Selesai' },
  batal: { cls: 'badge-gray', label: 'Batal' },
}
const SURAT_BADGE: Record<Surat['status'], { cls: string; label: string }> = {
  diajukan: { cls: 'badge-amber', label: 'Diajukan' },
  terbit: { cls: 'badge-green', label: 'Terbit' },
  batal: { cls: 'badge-gray', label: 'Batal' },
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function LayananPage() {
  const { profile, hasRole } = useAuth()
  const pid = profile?.perumahan_id
  const isPengurus = hasRole('ketua', 'bendahara', 'sekretaris')

  const [tab, setTab] = useState<Tab>('keluhan')
  const [keluhan, setKeluhan] = useState<Keluhan[]>([])
  const [fasilitas, setFasilitas] = useState<Fasilitas[]>([])
  const [booking, setBooking] = useState<Booking[]>([])
  const [surat, setSurat] = useState<Surat[]>([])
  const [warga, setWarga] = useState<Warga[]>([])
  const [ready, setReady] = useState(false)

  // keluhan
  const [khOpen, setKhOpen] = useState(false)
  const [khForm, setKhForm] = useState({ kategori: KAT_KELUHAN[0], judul: '', isi: '' })
  const [khBusy, setKhBusy] = useState(false)

  // booking
  const [bkOpen, setBkOpen] = useState(false)
  const [bkForm, setBkForm] = useState({ fasilitas_id: '', tgl: todayStr(), jam_mulai: '', jam_selesai: '', warga_id: '', keperluan: '' })
  const [bkBusy, setBkBusy] = useState(false)

  // fasilitas CRUD
  const [fsOpen, setFsOpen] = useState(false)
  const [fsShow, setFsShow] = useState(false)
  const [fsEdit, setFsEdit] = useState<Fasilitas | null>(null)
  const [fsForm, setFsForm] = useState({ nama: '', kapasitas: '', biaya: '' })
  const [fsBusy, setFsBusy] = useState(false)

  // surat
  const [srOpen, setSrOpen] = useState(false)
  const [srForm, setSrForm] = useState({ jenis: JENIS_SURAT[0], keperluan: '' })
  const [srBusy, setSrBusy] = useState(false)

  // terbit surat
  const [trOpen, setTrOpen] = useState(false)
  const [trTarget, setTrTarget] = useState<Surat | null>(null)
  const [trNo, setTrNo] = useState('')
  const [trBusy, setTrBusy] = useState(false)

  // hapus
  const [confirm, setConfirm] = useState<null | { aksi: 'keluhan' | 'booking' | 'fasilitas' | 'surat'; id: string; nama: string }>(null)
  const [delBusy, setDelBusy] = useState(false)

  const reload = useMemo(() => {
    if (!pid) return
    return async () => {
      const [kh, fs, bk, sr, w] = await Promise.all([
        supabase.from('keluhan').select('*').eq('perumahan_id', pid).order('created_at', { ascending: false }),
        supabase.from('fasilitas').select('*').eq('perumahan_id', pid).order('nama'),
        supabase.from('booking').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('surat').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }),
        supabase.from('warga').select('*').eq('perumahan_id', pid),
      ])
      setKeluhan((kh.data ?? []) as Keluhan[])
      setFasilitas((fs.data ?? []) as Fasilitas[])
      setBooking((bk.data ?? []) as Booking[])
      setSurat((sr.data ?? []) as Surat[])
      setWarga((w.data ?? []) as Warga[])
    }
  }, [pid]) as (() => void) | undefined

  useEffect(() => {
    let alive = true
    async function init() {
      try {
        if (reload) await reload()
      } catch {
        showToast('Gagal memuat data', 'danger')
      } finally {
        if (alive) setReady(true)
      }
    }
    init()
    return () => {
      alive = false
    }
  }, [reload])

  const myWargaId = useMemo(() => {
    const hit = warga.find((w) => profile?.rumah_id && w.rumah_id === profile.rumah_id && w.aktif)
    return hit?.id ?? null
  }, [warga, profile?.rumah_id])

  const wargaLabel = (id: string | null): string => {
    if (!id) return '—'
    const w = warga.find((x) => x.id === id)
    return w ? w.nama : '—'
  }
  const fasilitasLabel = (id: string): string => fasilitas.find((f) => f.id === id)?.nama || '—'

  // ── Keluhan ────────────────────────────────────────
  const saveKeluhan = async () => {
    if (!pid) return
    if (!khForm.judul.trim()) {
      showToast('Judul keluhan wajib diisi', 'warning')
      return
    }
    setKhBusy(true)
    try {
      const { error } = await supabase.from('keluhan').insert({
        perumahan_id: pid,
        warga_id: myWargaId,
        kategori: khForm.kategori,
        judul: khForm.judul.trim(),
        isi: khForm.isi,
        status: 'baru',
      })
      if (error) throw error
      showToast('Keluhan terkirim ✓', 'success')
      setKhOpen(false)
      setKhForm({ kategori: KAT_KELUHAN[0], judul: '', isi: '' })
      if (reload) await reload()
    } catch {
      showToast('Gagal mengirim keluhan', 'danger')
    } finally {
      setKhBusy(false)
    }
  }

  const setKeluhanStatus = async (k: Keluhan, status: Keluhan['status']) => {
    const payload: Partial<Keluhan> = { status }
    if (status === 'selesai') payload.tgl_selesai = todayStr()
    await supabase.from('keluhan').update(payload).eq('id', k.id)
    showToast('Status diperbarui', 'success')
    if (reload) await reload()
  }

  // ── Fasilitas ──────────────────────────────────────
  const openFs = (f?: Fasilitas) => {
    setFsEdit(f ?? null)
    setFsForm(f ? { nama: f.nama, kapasitas: String(f.kapasitas), biaya: String(f.biaya) } : { nama: '', kapasitas: '', biaya: '' })
    setFsOpen(true)
  }
  const saveFs = async () => {
    if (!pid) return
    if (!fsForm.nama.trim()) {
      showToast('Nama fasilitas wajib diisi', 'warning')
      return
    }
    setFsBusy(true)
    try {
      const payload = {
        nama: fsForm.nama.trim(),
        kapasitas: parseInt(fsForm.kapasitas) || 0,
        biaya: parseInt(fsForm.biaya) || 0,
        perumahan_id: pid,
      }
      let error: unknown = null
      if (fsEdit) {
        ;({ error } = await supabase.from('fasilitas').update(payload).eq('id', fsEdit.id))
      } else {
        ;({ error } = await supabase.from('fasilitas').insert(payload))
      }
      if (error) throw error
      showToast(fsEdit ? 'Fasilitas diperbarui' : 'Fasilitas ditambahkan', 'success')
      setFsOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan fasilitas', 'danger')
    } finally {
      setFsBusy(false)
    }
  }

  // ── Booking ────────────────────────────────────────
  const saveBooking = async () => {
    if (!pid) return
    if (!bkForm.fasilitas_id) {
      showToast('Pilih fasilitas', 'warning')
      return
    }
    setBkBusy(true)
    try {
      const { error } = await supabase.from('booking').insert({
        perumahan_id: pid,
        fasilitas_id: bkForm.fasilitas_id,
        warga_id: bkForm.warga_id || myWargaId,
        tgl: bkForm.tgl,
        jam_mulai: bkForm.jam_mulai,
        jam_selesai: bkForm.jam_selesai,
        keperluan: bkForm.keperluan,
        status: 'menunggu',
      })
      if (error) throw error
      showToast('Booking diajukan ✓', 'success')
      setBkOpen(false)
      setBkForm({ ...bkForm, fasilitas_id: '', jam_mulai: '', jam_selesai: '', keperluan: '' })
      if (reload) await reload()
    } catch {
      showToast('Gagal booking', 'danger')
    } finally {
      setBkBusy(false)
    }
  }

  const setBookingStatus = async (b: Booking, status: Booking['status']) => {
    await supabase.from('booking').update({ status }).eq('id', b.id)
    showToast(`Booking ${BOOKING_BADGE[status].label}`, 'success')
    if (reload) await reload()
  }

  // ── Surat ──────────────────────────────────────────
  const saveSurat = async () => {
    if (!pid) return
    if (!srForm.keperluan.trim()) {
      showToast('Keperluan wajib diisi', 'warning')
      return
    }
    setSrBusy(true)
    try {
      const { error } = await supabase.from('surat').insert({
        perumahan_id: pid,
        no_surat: `AJUAN-${Date.now()}`,
        jenis: srForm.jenis,
        warga_id: myWargaId,
        keperluan: srForm.keperluan.trim(),
        tgl: todayStr(),
        status: 'diajukan',
      })
      if (error) throw error
      showToast('Permohonan surat dikirim ✓', 'success')
      setSrOpen(false)
      setSrForm({ jenis: JENIS_SURAT[0], keperluan: '' })
      if (reload) await reload()
    } catch {
      showToast('Gagal mengajukan surat', 'danger')
    } finally {
      setSrBusy(false)
    }
  }

  const openTerbit = (s: Surat) => {
    setTrTarget(s)
    setTrNo(s.no_surat.startsWith('AJUAN-') ? '' : s.no_surat)
    setTrOpen(true)
  }
  const terbitSurat = async () => {
    if (!trTarget) return
    if (!trNo.trim()) {
      showToast('Nomor surat wajib diisi', 'warning')
      return
    }
    setTrBusy(true)
    try {
      const { error } = await supabase.from('surat').update({ no_surat: trNo.trim(), status: 'terbit' }).eq('id', trTarget.id)
      if (error) throw error
      showToast('Surat terbit ✓', 'success')
      setTrOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Nomor surat mungkin sudah dipakai', 'danger')
    } finally {
      setTrBusy(false)
    }
  }
  const setSuratStatus = async (s: Surat, status: Surat['status']) => {
    await supabase.from('surat').update({ status }).eq('id', s.id)
    showToast('Status surat diperbarui', 'success')
    if (reload) await reload()
  }

  // ── Hapus ──────────────────────────────────────────
  const doHapus = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      const table = { keluhan: 'keluhan', booking: 'booking', fasilitas: 'fasilitas', surat: 'surat' }[confirm.aksi]
      await supabase.from(table).delete().eq('id', confirm.id)
      showToast('Dihapus', 'success')
      setConfirm(null)
      if (reload) await reload()
    } catch {
      showToast('Gagal menghapus', 'danger')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <div className="tab-page">
      <div className="chip-row">
        <button className={`chip${tab === 'keluhan' ? ' active' : ''}`} onClick={() => setTab('keluhan')}>
          🛠 Keluhan
        </button>
        <button className={`chip${tab === 'booking' ? ' active' : ''}`} onClick={() => setTab('booking')}>
          📅 Booking
        </button>
        <button className={`chip${tab === 'surat' ? ' active' : ''}`} onClick={() => setTab('surat')}>
          📄 Surat
        </button>
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : tab === 'keluhan' ? (
        <>
          <div className="row-actions">
            <button className="btn btn-primary btn-block" onClick={() => setKhOpen(true)}>
              <span className="mat-icon">bug_report</span> Laporkan Masalah
            </button>
          </div>
          {keluhan.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">verified_user</span>
                <p>Belum ada laporan. Semua baik-baik saja.</p>
              </div>
            </div>
          ) : (
            keluhan.map((k) => (
              <div className="card" key={k.id}>
                <div className="card-title">
                  {k.kategori && <span className="badge badge-blue">{k.kategori}</span>}
                  <span style={{ flex: 1, minWidth: 0 }}>{k.judul}</span>
                  <span className={KELUHAN_BADGE[k.status].cls}>{KELUHAN_BADGE[k.status].label}</span>{' '}
                  {isPengurus && (
                    <>
                      {(k.status === 'baru' || k.status === 'diproses') && (
                        <button className="btn btn-sm btn-outline" style={{ minHeight: 30 }} onClick={() => setKeluhanStatus(k, 'diproses')}>
                          Proses
                        </button>
                      )}
                      {k.status === 'diproses' && (
                        <button className="btn btn-sm btn-success" style={{ minHeight: 30 }} onClick={() => setKeluhanStatus(k, 'selesai')}>
                          Selesai
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger" style={{ minHeight: 30 }} onClick={() => setConfirm({ aksi: 'keluhan', id: k.id, nama: k.judul })}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
                {k.isi && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{k.isi}</div>}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {formatTanggal(k.created_at)} · Pelapor: {wargaLabel(k.warga_id)}
                </div>
              </div>
            ))
          )}
        </>
      ) : tab === 'booking' ? (
        <>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={() => setBkOpen(true)}>
              <span className="mat-icon">event_available</span> Booking
            </button>
            {isPengurus && (
              <button className="btn btn-outline" onClick={() => { setFsShow(!fsShow); }} style={{ minHeight: 44 }}>
                {fsShow ? 'Tutup Fasilitas' : `${fasilitas.length} Fasilitas`}
              </button>
            )}
          </div>

          {isPengurus && fsShow && (
            <div className="card" style={{ padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <b style={{ fontSize: '0.85rem' }}>Kelola Fasilitas</b>
                <button className="btn btn-sm btn-primary" style={{ minHeight: 30 }} onClick={() => openFs()}>
                  + Tambah
                </button>
              </div>
              {fasilitas.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Belum ada fasilitas.</div>
              ) : (
                fasilitas.map((f) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{f.nama}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {f.kapasitas > 0 ? `${f.kapasitas} orang` : '—'} · {f.biaya > 0 ? formatRp(f.biaya) : 'Gratis'}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline" style={{ minHeight: 30 }} onClick={() => openFs(f)}>
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ minHeight: 30 }} onClick={() => setConfirm({ aksi: 'fasilitas', id: f.id, nama: f.nama })}>
                      🗑
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {booking.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">event_available</span>
                <p>Belum ada booking fasilitas.</p>
              </div>
            </div>
          ) : (
            booking.map((b) => (
              <div className="card" key={b.id}>
                <div className="card-title">
                  <span className="mat-icon">event</span>
                  <span style={{ flex: 1 }}>{fasilitasLabel(b.fasilitas_id)}</span>
                  <span className={BOOKING_BADGE[b.status].cls}>{BOOKING_BADGE[b.status].label}</span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>
                  🗓 {formatTanggal(b.tgl)}
                  {b.jam_mulai ? ` · ${b.jam_mulai}${b.jam_selesai ? `–${b.jam_selesai}` : ''}` : ''}
                </div>
                {b.keperluan && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{b.keperluan}</div>}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  👤 {wargaLabel(b.warga_id)}
                </div>
                {isPengurus && (
                  <div className="row-actions" style={{ marginBottom: 0, gap: 8 }}>
                    {b.status === 'menunggu' && (
                      <>
                        <button className="btn btn-sm btn-success" style={{ minHeight: 32, flex: 1 }} onClick={() => setBookingStatus(b, 'disetujui')}>
                          Setujui
                        </button>
                        <button className="btn btn-sm btn-danger" style={{ minHeight: 32, flex: 1 }} onClick={() => setBookingStatus(b, 'ditolak')}>
                          Tolak
                        </button>
                      </>
                    )}
                    {b.status === 'disetujui' && (
                      <button className="btn btn-sm btn-outline" style={{ minHeight: 32, flex: 1 }} onClick={() => setBookingStatus(b, 'selesai')}>
                        Tandai Selesai
                      </button>
                    )}
                    {(b.status === 'disetujui' || b.status === 'menunggu') && (
                      <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => setBookingStatus(b, 'batal')}>
                        Batal
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => { setBkOpen(true); setBkForm({ fasilitas_id: b.fasilitas_id, tgl: b.tgl, jam_mulai: b.jam_mulai, jam_selesai: b.jam_selesai, warga_id: b.warga_id ?? '', keperluan: b.keperluan }); }}>
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'booking', id: b.id, nama: fasilitasLabel(b.fasilitas_id) })}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <div className="row-actions">
            <button className="btn btn-primary btn-block" onClick={() => setSrOpen(true)}>
              <span className="mat-icon">note_add</span> Ajukan Surat
            </button>
          </div>
          {surat.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">note_add</span>
                <p>Belum ada permohonan surat.</p>
              </div>
            </div>
          ) : (
            surat.map((s) => (
              <div className="card" key={s.id}>
                <div className="card-title">
                  <span className="mat-icon">description</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{s.jenis}</span>
                  <span className={SURAT_BADGE[s.status].cls}>{SURAT_BADGE[s.status].label}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>No: {s.no_surat}</div>
                {s.keperluan && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{s.keperluan}</div>}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {formatTanggal(s.tgl)} · Pemohon: {wargaLabel(s.warga_id)}
                </div>
                {isPengurus && (
                  <div className="row-actions" style={{ marginBottom: 0, gap: 8 }}>
                    {s.status === 'diajukan' && (
                      <>
                        <button className="btn btn-sm btn-success" style={{ minHeight: 32, flex: 1 }} onClick={() => openTerbit(s)}>
                          Terbitkan
                        </button>
                        <button className="btn btn-sm btn-danger" style={{ minHeight: 32, flex: 1 }} onClick={() => setSuratStatus(s, 'batal')}>
                          Batal
                        </button>
                      </>
                    )}
                    <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => { setSrOpen(true); setSrForm({ jenis: s.jenis, keperluan: s.keperluan }); }}>
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'surat', id: s.id, nama: s.jenis })}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {/* modal keluhan */}
      <Modal
        open={khOpen}
        onClose={() => setKhOpen(false)}
        title="Lapor Masalah"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setKhOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveKeluhan} disabled={khBusy}>
              {khBusy ? '⏳' : 'Kirim'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select className="form-control" value={khForm.kategori} onChange={(e) => setKhForm({ ...khForm, kategori: e.target.value })}>
            {KAT_KELUHAN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Judul*</label>
          <input className="form-control" placeholder="contoh: lampu taman mati" value={khForm.judul} onChange={(e) => setKhForm({ ...khForm, judul: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Keterangan</label>
          <textarea className="form-control" value={khForm.isi} onChange={(e) => setKhForm({ ...khForm, isi: e.target.value })} />
        </div>
      </Modal>

      {/* modal booking */}
      <Modal
        open={bkOpen}
        onClose={() => setBkOpen(false)}
        title="Booking Fasilitas"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setBkOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveBooking} disabled={bkBusy}>
              {bkBusy ? '⏳' : 'Ajukan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Fasilitas*</label>
          <select className="form-control" value={bkForm.fasilitas_id} onChange={(e) => setBkForm({ ...bkForm, fasilitas_id: e.target.value })}>
            <option value="">— Pilih fasilitas —</option>
            {fasilitas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nama}{f.biaya > 0 ? ` · ${formatRp(f.biaya)}` : ' · Gratis'}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-control" type="date" value={bkForm.tgl} onChange={(e) => setBkForm({ ...bkForm, tgl: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Jam Mulai</label>
            <input className="form-control" type="time" value={bkForm.jam_mulai} onChange={(e) => setBkForm({ ...bkForm, jam_mulai: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Jam Selesai</label>
            <input className="form-control" type="time" value={bkForm.jam_selesai} onChange={(e) => setBkForm({ ...bkForm, jam_selesai: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Atas Nama (warga)</label>
          <select className="form-control" value={bkForm.warga_id} onChange={(e) => setBkForm({ ...bkForm, warga_id: e.target.value })}>
            <option value="">— Otomatis {wargaLabel(myWargaId)} —</option>
            {warga.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nama}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Keperluan</label>
          <textarea className="form-control" placeholder="contoh: rapat RT, arisan" value={bkForm.keperluan} onChange={(e) => setBkForm({ ...bkForm, keperluan: e.target.value })} />
        </div>
      </Modal>

      {/* modal fasilitas */}
      <Modal
        open={fsOpen}
        onClose={() => setFsOpen(false)}
        title={fsEdit ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setFsOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveFs} disabled={fsBusy}>
              {fsBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama*</label>
          <input className="form-control" placeholder="contoh: Balai RT 05" value={fsForm.nama} onChange={(e) => setFsForm({ ...fsForm, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Kapasitas (orang)</label>
          <input className="form-control" inputMode="numeric" value={fsForm.kapasitas} onChange={(e) => setFsForm({ ...fsForm, kapasitas: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Biaya sewa (Rp, 0 = gratis)</label>
          <input className="form-control" inputMode="numeric" value={fsForm.biaya} onChange={(e) => setFsForm({ ...fsForm, biaya: e.target.value })} />
        </div>
      </Modal>

      {/* modal surat */}
      <Modal
        open={srOpen}
        onClose={() => setSrOpen(false)}
        title="Ajukan Permohonan Surat"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setSrOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveSurat} disabled={srBusy}>
              {srBusy ? '⏳' : 'Ajukan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Jenis Surat</label>
          <select className="form-control" value={srForm.jenis} onChange={(e) => setSrForm({ ...srForm, jenis: e.target.value })}>
            {JENIS_SURAT.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Keperluan*</label>
          <textarea className="form-control" placeholder="contoh: untuk pengurusan buku tabungan" value={srForm.keperluan} onChange={(e) => setSrForm({ ...srForm, keperluan: e.target.value })} />
        </div>
      </Modal>

      {/* modal terbit surat */}
      <Modal
        open={trOpen}
        onClose={() => setTrOpen(false)}
        title="Terbitkan Surat"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setTrOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={terbitSurat} disabled={trBusy}>
              {trBusy ? '⏳' : 'Terbitkan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nomor Surat*</label>
          <input className="form-control" placeholder="contoh: 005/BKS/2026" value={trNo} onChange={(e) => setTrNo(e.target.value)} />
        </div>
      </Modal>

      {/* konfirmasi hapus */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hapus?"
        message={`Hapus ${confirm?.aksi === 'keluhan' ? 'keluhan' : confirm?.aksi === 'surat' ? 'permohonan surat' : confirm?.nama}?`}
        loading={delBusy}
        onConfirm={doHapus}
      />
    </div>
  )
}