import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import { formatTanggal } from '../lib/format'
import { waShare } from '../lib/wa'
import type { DirektoriUsaha, Kegiatan, Pengumuman, Polling, PollingSuara, Warga } from '../lib/types'

type Tab = 'pengumuman' | 'kegiatan' | 'polling' | 'usaha'

interface PollOption {
  id: number
  label: string
}

const KATEGORI_USAHA = ['Kuliner', 'Jasa', 'Dagang', 'Otomotif', 'Lainnya']

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function KomunitasPage() {
  const { profile, user, hasRole } = useAuth()
  const pid = profile?.perumahan_id
  const myRumahId = profile?.rumah_id ?? null
  const isPengurus = hasRole('ketua', 'bendahara', 'sekretaris')

  const [tab, setTab] = useState<Tab>('pengumuman')
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([])
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([])
  const [polling, setPolling] = useState<Polling[]>([])
  const [suara, setSuara] = useState<PollingSuara[]>([])
  const [usaha, setUsaha] = useState<DirektoriUsaha[]>([])
  const [warga, setWarga] = useState<Warga[]>([])
  const [ready, setReady] = useState(false)

  // modal pengumuman
  const [pOpen, setPOpen] = useState(false)
  const [pEdit, setPEdit] = useState<Pengumuman | null>(null)
  const [pForm, setPForm] = useState({ judul: '', isi: '', penting: false })
  const [pBusy, setPBusy] = useState(false)

  // modal kegiatan
  const [kOpen, setKOpen] = useState(false)
  const [kEdit, setKEdit] = useState<Kegiatan | null>(null)
  const [kForm, setKForm] = useState({ nama: '', tgl: '', lokasi: '', deskripsi: '' })
  const [kBusy, setKBusy] = useState(false)

  // modal polling
  const [plOpen, setPlOpen] = useState(false)
  const [plEdit, setPlEdit] = useState<Polling | null>(null)
  const [plForm, setPlForm] = useState<{ judul: string; opsi: PollOption[]; tglSelesai: string }>({ judul: '', opsi: [{ id: 1, label: '' }, { id: 2, label: '' }], tglSelesai: '' })
  const [plBusy, setPlBusy] = useState(false)

  // modal usaha
  const [uOpen, setUOpen] = useState(false)
  const [uEdit, setUEdit] = useState<DirektoriUsaha | null>(null)
  const [uForm, setUForm] = useState({ nama_usaha: '', kategori: KATEGORI_USAHA[0], no_hp: '', deskripsi: '', warga_id: '' })
  const [uBusy, setUBusy] = useState(false)

  // konfirmasi hapus
  const [confirm, setConfirm] = useState<null | { aksi: 'pengumuman' | 'kegiatan' | 'polling' | 'usaha'; id: string; nama: string }>(null)
  const [delBusy, setDelBusy] = useState(false)

  const reload = useMemo(() => {
    if (!pid) return
    return async () => {
      const [p, k, pl, u, w] = await Promise.all([
        supabase.from('pengumuman').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }).order('created_at', { ascending: false }).limit(100),
        supabase.from('kegiatan').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false, nullsFirst: false }),
        supabase.from('polling').select('*').eq('perumahan_id', pid).order('tgl_mulai', { ascending: false, nullsFirst: false }),
        supabase.from('direktori_usaha').select('*').eq('perumahan_id', pid).order('nama_usaha'),
        supabase.from('warga').select('*').eq('perumahan_id', pid),
      ])
      const pollingList = (pl.data ?? []) as Polling[]
      let suaraList: PollingSuara[] = []
      if (pollingList.length > 0) {
        const ids = pollingList.map((x) => x.id)
        const { data: sv } = await supabase.from('polling_suara').select('*').in('polling_id', ids)
        suaraList = (sv ?? []) as PollingSuara[]
      }
      setPengumuman((p.data ?? []) as Pengumuman[])
      setKegiatan((k.data ?? []) as Kegiatan[])
      setPolling(pollingList)
      setSuara(suaraList)
      setUsaha((u.data ?? []) as DirektoriUsaha[])
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

  const wargaLabel = (id: string | null): string => {
    if (!id) return '—'
    const w = warga.find((x) => x.id === id)
    return w ? w.nama : '—'
  }

  // ── Pengumuman ───────────────────────────────────────
  const openP = (p?: Pengumuman) => {
    setPEdit(p ?? null)
    setPForm(p ? { judul: p.judul, isi: p.isi ?? '', penting: p.penting } : { judul: '', isi: '', penting: false })
    setPOpen(true)
  }

  const saveP = async () => {
    if (!pid) return
    if (!pForm.judul.trim()) {
      showToast('Judul wajib diisi', 'warning')
      return
    }
    setPBusy(true)
    try {
      const payload = { judul: pForm.judul.trim(), isi: pForm.isi, penting: pForm.penting, perumahan_id: pid, user_id: user?.id ?? null }
      let error: unknown = null
      if (pEdit) {
        ;({ error } = await supabase.from('pengumuman').update({ judul: payload.judul, isi: payload.isi, penting: payload.penting }).eq('id', pEdit.id))
      } else {
        ;({ error } = await supabase.from('pengumuman').insert(payload))
      }
      if (error) throw error
      showToast(pEdit ? 'Pengumuman diperbarui' : 'Pengumuman dipublikasikan', 'success')
      setPOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan pengumuman', 'danger')
    } finally {
      setPBusy(false)
    }
  }

  // ── Kegiatan ─────────────────────────────────────────
  const openK = (k?: Kegiatan) => {
    setKEdit(k ?? null)
    setKForm(k ? { nama: k.nama, tgl: k.tgl ?? '', lokasi: k.lokasi ?? '', deskripsi: k.deskripsi ?? '' } : { nama: '', tgl: '', lokasi: '', deskripsi: '' })
    setKOpen(true)
  }

  const saveK = async () => {
    if (!pid) return
    if (!kForm.nama.trim()) {
      showToast('Nama kegiatan wajib diisi', 'warning')
      return
    }
    setKBusy(true)
    try {
      const payload = { nama: kForm.nama.trim(), tgl: kForm.tgl || null, lokasi: kForm.lokasi.trim(), deskripsi: kForm.deskripsi, perumahan_id: pid }
      let error: unknown = null
      if (kEdit) {
        ;({ error } = await supabase.from('kegiatan').update(payload).eq('id', kEdit.id))
      } else {
        ;({ error } = await supabase.from('kegiatan').insert(payload))
      }
      if (error) throw error
      showToast(kEdit ? 'Kegiatan diperbarui' : 'Kegiatan ditambahkan', 'success')
      setKOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan kegiatan', 'danger')
    } finally {
      setKBusy(false)
    }
  }

  // ── Polling ──────────────────────────────────────────
  const parseOpsi = (p: Polling): string[] => {
    try {
      const arr = JSON.parse(p.opsi_json || '[]')
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
    } catch {
      return []
    }
  }

  const isExpired = (p: Polling): boolean => {
    if (!p.tgl_selesai) return false
    return p.tgl_selesai < todayStr()
  }

  const pollStats = (p: Polling) => {
    const opts = parseOpsi(p)
    const votes = suara.filter((s) => s.polling_id === p.id)
    const counts = new Map<string, number>()
    for (const v of votes) counts.set(v.opsi, (counts.get(v.opsi) ?? 0) + 1)
    const myVote = myRumahId ? votes.find((v) => v.rumah_id === myRumahId)?.opsi : undefined
    return { opts, counts, total: votes.length, myVote }
  }

  const openPl = (p?: Polling) => {
    setPlEdit(p ?? null)
    if (p) {
      const opts = parseOpsi(p).map((label, i) => ({ id: i + 1, label }))
      setPlForm({ judul: p.judul, opsi: opts.length >= 2 ? opts : [{ id: 1, label: '' }, { id: 2, label: '' }], tglSelesai: p.tgl_selesai ?? '' })
    } else {
      setPlForm({ judul: '', opsi: [{ id: 1, label: '' }, { id: 2, label: '' }], tglSelesai: '' })
    }
    setPlOpen(true)
  }

  const addOpsi = () => {
    if (plForm.opsi.length >= 6) return
    const nextId = Math.max(0, ...plForm.opsi.map((o) => o.id)) + 1
    setPlForm({ ...plForm, opsi: [...plForm.opsi, { id: nextId, label: '' }] })
  }

  const removeOpsi = (id: number) => {
    if (plForm.opsi.length <= 2) return
    setPlForm({ ...plForm, opsi: plForm.opsi.filter((o) => o.id !== id) })
  }

  const savePl = async () => {
    if (!pid) return
    const labels = plForm.opsi.map((o) => o.label.trim()).filter(Boolean)
    if (!plForm.judul.trim()) {
      showToast('Judul polling wajib diisi', 'warning')
      return
    }
    if (labels.length < 2) {
      showToast('Minimal 2 opsi', 'warning')
      return
    }
    setPlBusy(true)
    try {
      const payload = {
        judul: plForm.judul.trim(),
        opsi_json: JSON.stringify(labels),
        tgl_selesai: plForm.tglSelesai || null,
        perumahan_id: pid,
      }
      let error: unknown = null
      if (plEdit) {
        const { judul, opsi_json, tgl_selesai } = payload
        ;({ error } = await supabase.from('polling').update({ judul, opsi_json, tgl_selesai }).eq('id', plEdit.id))
      } else {
        ;({ error } = await supabase.from('polling').insert({ ...payload, tgl_mulai: todayStr(), aktif: true }))
      }
      if (error) throw error
      showToast(plEdit ? 'Polling diperbarui' : 'Polling dibuat', 'success')
      setPlOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan polling', 'danger')
    } finally {
      setPlBusy(false)
    }
  }

  const vote = async (p: Polling, opsi: string) => {
    if (!pid || !myRumahId) {
      showToast('Akun belum terhubung ke rumah — hubungi pengurus', 'warning')
      return
    }
    // ganti pilihan: hapus suara lama dulu (rumah yang sama)
    await supabase.from('polling_suara').delete().eq('polling_id', p.id).eq('rumah_id', myRumahId)
    const { error } = await supabase.from('polling_suara').insert({
      perumahan_id: pid,
      polling_id: p.id,
      rumah_id: myRumahId,
      opsi,
    })
    if (error) {
      showToast(error.message === 'duplicate key value violates unique constraint "polling_suara_polling_id_rumah_id_key"' ? 'Rumah ini sudah memilih' : error.message, 'danger')
      return
    }
    showToast('Suara tercatat ✓', 'success')
    if (reload) await reload()
  }

  const togglePollingAktif = async (p: Polling) => {
    await supabase.from('polling').update({ aktif: !p.aktif }).eq('id', p.id)
    showToast(p.aktif ? 'Polling ditutup' : 'Polling dibuka kembali', 'success')
    if (reload) await reload()
  }

  // ── Usaha ────────────────────────────────────────────
  const openU = (u?: DirektoriUsaha) => {
    setUEdit(u ?? null)
    setUForm(u ? { nama_usaha: u.nama_usaha, kategori: u.kategori || KATEGORI_USAHA[0], no_hp: u.no_hp ?? '', deskripsi: u.deskripsi ?? '', warga_id: u.warga_id ?? '' } : { nama_usaha: '', kategori: KATEGORI_USAHA[0], no_hp: '', deskripsi: '', warga_id: '' })
    setUOpen(true)
  }

  const saveU = async () => {
    if (!pid) return
    if (!uForm.nama_usaha.trim()) {
      showToast('Nama usaha wajib diisi', 'warning')
      return
    }
    setUBusy(true)
    try {
      const payload = {
        nama_usaha: uForm.nama_usaha.trim(),
        kategori: uForm.kategori,
        no_hp: uForm.no_hp.trim(),
        deskripsi: uForm.deskripsi.trim(),
        warga_id: uForm.warga_id || null,
        perumahan_id: pid,
      }
      let error: unknown = null
      if (uEdit) {
        ;({ error } = await supabase.from('direktori_usaha').update(payload).eq('id', uEdit.id))
      } else {
        ;({ error } = await supabase.from('direktori_usaha').insert(payload))
      }
      if (error) throw error
      showToast(uEdit ? 'Usaha diperbarui' : 'Usaha ditambahkan', 'success')
      setUOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan usaha', 'danger')
    } finally {
      setUBusy(false)
    }
  }

  // ── hapus ────────────────────────────────────────────
  const doHapus = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      const table = { pengumuman: 'pengumuman', kegiatan: 'kegiatan', polling: 'polling', usaha: 'direktori_usaha' }[confirm.aksi]
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
        <button className={`chip${tab === 'pengumuman' ? ' active' : ''}`} onClick={() => setTab('pengumuman')}>
          📢 Pengumuman
        </button>
        <button className={`chip${tab === 'kegiatan' ? ' active' : ''}`} onClick={() => setTab('kegiatan')}>
          📅 Kegiatan
        </button>
        <button className={`chip${tab === 'polling' ? ' active' : ''}`} onClick={() => setTab('polling')}>
          📊 Polling
        </button>
        <button className={`chip${tab === 'usaha' ? ' active' : ''}`} onClick={() => setTab('usaha')}>
          🏪 Usaha
        </button>
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : tab === 'pengumuman' ? (
        <>
          {isPengurus && (
            <div className="row-actions">
              <button className="btn btn-primary btn-block" onClick={() => openP()}>
                <span className="mat-icon">campaign</span> Buat Pengumuman
              </button>
            </div>
          )}
          {pengumuman.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">campaign</span>
                <p>Belum ada pengumuman.</p>
              </div>
            </div>
          ) : (
            pengumuman.map((p) => (
              <div className="card" key={p.id}>
                <div className="card-title">
                  {p.penting ? <span className="badge badge-red">Penting</span> : <span className="badge badge-blue">Info</span>}
                  <span style={{ flex: 1, minWidth: 0 }}>{p.judul}</span>
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ minHeight: 30 }}
                    onClick={() => waShare(`📢 *${p.judul}*\n${p.isi ?? ''}\n\n— dari aplikasi RumahKita`)}
                  >
                    📤
                  </button>
                  {isPengurus && (
                    <>
                      <button className="btn btn-sm btn-outline" style={{ minHeight: 30 }} onClick={() => openP(p)}>
                        ✏️
                      </button>
                      <button className="btn btn-sm btn-danger" style={{ minHeight: 30 }} onClick={() => setConfirm({ aksi: 'pengumuman', id: p.id, nama: p.judul })}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
                {p.isi && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', marginBottom: 8 }}>{p.isi}</div>
                )}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatTanggal(p.tgl || p.created_at)}</div>
              </div>
            ))
          )}
        </>
      ) : tab === 'kegiatan' ? (
        <>
          {isPengurus && (
            <div className="row-actions">
              <button className="btn btn-primary btn-block" onClick={() => openK()}>
                <span className="mat-icon">event</span> Tambah Kegiatan
              </button>
            </div>
          )}
          {kegiatan.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">event</span>
                <p>Belum ada kegiatan.</p>
              </div>
            </div>
          ) : (
            kegiatan.map((k) => (
              <div className="card" key={k.id}>
                <div className="card-title">
                  <span className="mat-icon">event</span>
                  <span style={{ flex: 1 }}>{k.nama}</span>
                  {isPengurus && (
                    <>
                      <button className="btn btn-sm btn-outline" style={{ minHeight: 30 }} onClick={() => openK(k)}>
                        ✏️
                      </button>
                      <button className="btn btn-sm btn-danger" style={{ minHeight: 30 }} onClick={() => setConfirm({ aksi: 'kegiatan', id: k.id, nama: k.nama })}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
                {k.tgl && (
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>
                    🗓 {formatTanggal(k.tgl)}
                    {k.lokasi ? ` · 📍 ${k.lokasi}` : ''}
                  </div>
                )}
                {k.deskripsi && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{k.deskripsi}</div>}
              </div>
            ))
          )}
        </>
      ) : tab === 'polling' ? (
        <>
          {isPengurus && (
            <div className="row-actions">
              <button className="btn btn-primary btn-block" onClick={() => openPl()}>
                <span className="mat-icon">poll</span> Buat Polling
              </button>
            </div>
          )}
          {polling.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">poll</span>
                <p>Belum ada polling.</p>
              </div>
            </div>
          ) : (
            polling.map((p) => {
              const { opts, counts, total, myVote } = pollStats(p)
              const expired = isExpired(p)
              const canVote = p.aktif && !expired && !!myRumahId
              return (
                <div className="card" key={p.id}>
                  <div className="card-title">
                    <span className="mat-icon">poll</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{p.judul}</span>
                    {expired ? <span className="badge badge-gray">Berakhir</span> : p.aktif ? <span className="badge badge-green">Aktif</span> : <span className="badge badge-red">Ditutup</span>}
                    {isPengurus && (
                      <>
                        <button className="btn btn-sm btn-outline" style={{ minHeight: 30 }} onClick={() => openPl(p)}>
                          ✏️
                        </button>
                        <button className="btn btn-sm btn-outline" style={{ minHeight: 30 }} onClick={() => togglePollingAktif(p)}>
                          {p.aktif ? '⏸' : '▶️'}
                        </button>
                        <button className="btn btn-sm btn-danger" style={{ minHeight: 30 }} onClick={() => setConfirm({ aksi: 'polling', id: p.id, nama: p.judul })}>
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                  {opts.map((o) => {
                    const count = counts.get(o) ?? 0
                    const pct = total ? Math.round((count / total) * 100) : 0
                    const selected = myVote === o
                    return (
                      <button
                        key={o}
                        className={`vote-option${selected ? ' selected' : ''}`}
                        onClick={() => vote(p, o)}
                        disabled={!canVote}
                      >
                        <div className="vote-top">
                          {selected && <span className="mat-icon" style={{ fontSize: 18, color: 'var(--primary)' }}>check_circle</span>}
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="vote-bar">
                          <div style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    )
                  })}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    {total} suara
                    {myVote ? ` · pilihan Anda: ${myVote}` : canVote ? ' · tap opsi untuk memilih' : ' · menunggu dibuka'}
                  </div>
                </div>
              )
            })
          )}
        </>
      ) : (
        <>
          {isPengurus && (
            <div className="row-actions">
              <button className="btn btn-primary btn-block" onClick={() => openU()}>
                <span className="mat-icon">storefront</span> Tambah Usaha
              </button>
            </div>
          )}
          {usaha.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">storefront</span>
                <p>Belum ada usaha warga terdaftar.</p>
              </div>
            </div>
          ) : (
            usaha.map((u) => (
              <div className="card" key={u.id}>
                <div className="card-title">
                  <span className="mat-icon">storefront</span>
                  <span style={{ flex: 1 }}>{u.nama_usaha}</span>
                  {u.kategori && <span className="badge badge-blue">{u.kategori}</span>}
                  {isPengurus && (
                    <>
                      <button className="btn btn-sm btn-outline" style={{ minHeight: 30 }} onClick={() => openU(u)}>
                        ✏️
                      </button>
                      <button className="btn btn-sm btn-danger" style={{ minHeight: 30 }} onClick={() => setConfirm({ aksi: 'usaha', id: u.id, nama: u.nama_usaha })}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
                {u.deskripsi && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{u.deskripsi}</div>}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  👤 {wargaLabel(u.warga_id)}
                  {u.no_hp && (
                    <>
                      {' · '}
                      <a href={`tel:${u.no_hp}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        📞 {u.no_hp}
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* modal pengumuman */}
      <Modal
        open={pOpen}
        onClose={() => setPOpen(false)}
        title={pEdit ? 'Edit Pengumuman' : 'Buat Pengumuman'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setPOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveP} disabled={pBusy}>
              {pBusy ? '⏳' : 'Publikasikan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Judul*</label>
          <input className="form-control" value={pForm.judul} onChange={(e) => setPForm({ ...pForm, judul: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Isi</label>
          <textarea className="form-control" value={pForm.isi} onChange={(e) => setPForm({ ...pForm, isi: e.target.value })} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600 }}>
          <input type="checkbox" checked={pForm.penting} onChange={(e) => setPForm({ ...pForm, penting: e.target.checked })} />
          Tandai penting (badge merah)
        </label>
      </Modal>

      {/* modal kegiatan */}
      <Modal
        open={kOpen}
        onClose={() => setKOpen(false)}
        title={kEdit ? 'Edit Kegiatan' : 'Tambah Kegiatan'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setKOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveK} disabled={kBusy}>
              {kBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama Kegiatan*</label>
          <input className="form-control" value={kForm.nama} onChange={(e) => setKForm({ ...kForm, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-control" type="date" value={kForm.tgl} onChange={(e) => setKForm({ ...kForm, tgl: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Lokasi</label>
          <input className="form-control" placeholder="contoh: Balai RT 05" value={kForm.lokasi} onChange={(e) => setKForm({ ...kForm, lokasi: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <textarea className="form-control" value={kForm.deskripsi} onChange={(e) => setKForm({ ...kForm, deskripsi: e.target.value })} />
        </div>
      </Modal>

      {/* modal polling */}
      <Modal
        open={plOpen}
        onClose={() => setPlOpen(false)}
        title={plEdit ? 'Edit Polling' : 'Buat Polling'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setPlOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={savePl} disabled={plBusy}>
              {plBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Pertanyaan*</label>
          <input className="form-control" placeholder="contoh: Jadwal kerja bakti bulan ini?" value={plForm.judul} onChange={(e) => setPlForm({ ...plForm, judul: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Opsi (2–6)</label>
          {plForm.opsi.map((o, i) => (
            <div key={o.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="form-control"
                placeholder={`Opsi ${i + 1}`}
                value={o.label}
                onChange={(e) => setPlForm({ ...plForm, opsi: plForm.opsi.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })}
              />
              <button className="btn btn-sm btn-danger" style={{ minHeight: 44 }} onClick={() => removeOpsi(o.id)} disabled={plForm.opsi.length <= 2}>
                ✕
              </button>
            </div>
          ))}
          <button className="btn btn-sm btn-outline" onClick={addOpsi} disabled={plForm.opsi.length >= 6}>
            + Tambah Opsi
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">Tutup otomatis (opsional)</label>
          <input className="form-control" type="date" value={plForm.tglSelesai} onChange={(e) => setPlForm({ ...plForm, tglSelesai: e.target.value })} />
        </div>
      </Modal>

      {/* modal usaha */}
      <Modal
        open={uOpen}
        onClose={() => setUOpen(false)}
        title={uEdit ? 'Edit Usaha' : 'Tambah Usaha'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setUOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveU} disabled={uBusy}>
              {uBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama Usaha*</label>
          <input className="form-control" placeholder="contoh: Warung Bu Sari" value={uForm.nama_usaha} onChange={(e) => setUForm({ ...uForm, nama_usaha: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select className="form-control" value={uForm.kategori} onChange={(e) => setUForm({ ...uForm, kategori: e.target.value })}>
            {KATEGORI_USAHA.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">No. HP / WA</label>
          <input className="form-control" inputMode="tel" value={uForm.no_hp} onChange={(e) => setUForm({ ...uForm, no_hp: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Pemilik (warga)</label>
          <select className="form-control" value={uForm.warga_id} onChange={(e) => setUForm({ ...uForm, warga_id: e.target.value })}>
            <option value="—">— Belum dipilih —</option>
            {warga.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nama}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Deskripsi</label>
          <textarea className="form-control" value={uForm.deskripsi} onChange={(e) => setUForm({ ...uForm, deskripsi: e.target.value })} />
        </div>
      </Modal>

      {/* konfirmasi hapus */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hapus?"
        message={
          confirm?.aksi === 'polling'
            ? `Hapus polling "${confirm.nama}"? Semua suara ikut terhapus.`
            : `Hapus "${confirm?.nama}"?`
        }
        loading={delBusy}
        onConfirm={doHapus}
      />
    </div>
  )
}