import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import type { Rumah, Warga } from '../lib/types'

type Tab = 'rumah' | 'warga'

const STATUS_HUNI: Record<string, string> = { dihuni: 'Dihuni', kosong: 'Kosong', kontrakan: 'Kontrakan' }
const STATUS_TINGGAL: Record<string, string> = { pemilik: 'Pemilik', penyewa: 'Penyewa', keluarga: 'Keluarga' }

const emptyRumah = { blok: '', nomor: '', tipe: '', status_huni: 'dihuni' as Rumah['status_huni'] }
const emptyWarga = {
  nama: '',
  nik: '',
  no_hp: '',
  status_tinggal: 'pemilik' as Warga['status_tinggal'],
  pekerjaan: '',
  rumah_id: '' as string,
  aktif: true,
}

export default function WargaPage() {
  const { profile } = useAuth()
  const pid = profile?.perumahan_id

  const [tab, setTab] = useState<Tab>('rumah')
  const [rumah, setRumah] = useState<Rumah[]>([])
  const [warga, setWarga] = useState<Warga[]>([])
  const [search, setSearch] = useState('')
  const [ready, setReady] = useState(false)

  // modal rumah
  const [rmOpen, setRmOpen] = useState(false)
  const [rmEdit, setRmEdit] = useState<Rumah | null>(null)
  const [rmForm, setRmForm] = useState(emptyRumah)
  const [rmBusy, setRmBusy] = useState(false)

  // modal generate massal
  const [genOpen, setGenOpen] = useState(false)
  const [genForm, setGenForm] = useState({ blok: '', awal: '1', akhir: '10', tipe: '' })
  const [genBusy, setGenBusy] = useState(false)

  // modal warga
  const [wgOpen, setWgOpen] = useState(false)
  const [wgEdit, setWgEdit] = useState<Warga | null>(null)
  const [wgForm, setWgForm] = useState(emptyWarga)
  const [wgBusy, setWgBusy] = useState(false)

  // konfirmasi hapus
  const [confirm, setConfirm] = useState<null | { jenis: 'rumah' | 'warga'; id: string; nama: string }>(null)
  const [delBusy, setDelBusy] = useState(false)

  const load = useMemo(() => {
    if (!pid) return
    return async () => {
      const [r, w] = await Promise.all([
        supabase.from('rumah').select('*').eq('perumahan_id', pid).order('blok').order('nomor'),
        supabase.from('warga').select('*').eq('perumahan_id', pid).order('nama'),
      ])
      setRumah((r.data ?? []) as Rumah[])
      setWarga((w.data ?? []) as Warga[])
    }
  }, [pid]) as (() => void) | undefined

  useEffect(() => {
    let alive = true
    async function init() {
      try {
        if (load) await load()
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
  }, [load])

  const rumahSorted = useMemo(() => {
    return [...rumah].sort((a, b) => {
      if (a.blok !== b.blok) return a.blok.localeCompare(b.blok)
      return (parseInt(a.nomor) || 0) - (parseInt(b.nomor) || 0)
    })
  }, [rumah])

  const wargaByRumah = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of warga) if (w.rumah_id) m.set(w.rumah_id, (m.get(w.rumah_id) ?? 0) + 1)
    return m
  }, [warga])

  const rumahLabel = (id: string | null): string => {
    if (!id) return '—'
    const r = rumah.find((x) => x.id === id)
    return r ? `${r.blok}${r.nomor}` : '—'
  }

  const rumahFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rumahSorted
    return rumahSorted.filter((r) => `${r.blok}${r.nomor} ${r.tipe} ${STATUS_HUNI[r.status_huni]}`.toLowerCase().includes(q))
  }, [rumahSorted, search])

  const wargaFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return warga
    return warga.filter((w) => `${w.nama} ${w.nik} ${w.no_hp} ${rumahLabel(w.rumah_id)}`.toLowerCase().includes(q))
  }, [warga, search, rumahLabel])

  // ── Rumah ──────────────────────────────────────────────
  const openRumahModal = (item?: Rumah) => {
    setRmEdit(item ?? null)
    setRmForm(item ? { blok: item.blok, nomor: item.nomor, tipe: item.tipe, status_huni: item.status_huni } : emptyRumah)
    setRmOpen(true)
  }

  const saveRumah = async () => {
    if (!pid) return
    if (!rmForm.blok.trim() || !rmForm.nomor.trim()) {
      showToast('Blok dan nomor wajib diisi', 'warning')
      return
    }
    setRmBusy(true)
    try {
      const payload = { ...rmForm, blok: rmForm.blok.trim().toUpperCase(), nomor: rmForm.nomor.trim(), perumahan_id: pid }
      let err: unknown = null
      if (rmEdit) {
        ;({ error: err } = await supabase.from('rumah').update(payload).eq('id', rmEdit.id))
      } else {
        ;({ error: err } = await supabase.from('rumah').insert(payload))
      }
      if ((err as { message?: string })?.message?.includes('duplicate') || (err as { code?: string })?.code === '23505') {
        showToast('Rumah sudah terdaftar', 'warning')
        setRmBusy(false)
        return
      }
      if (err) throw err
      showToast(rmEdit ? 'Rumah diperbarui' : 'Rumah ditambahkan', 'success')
      setRmOpen(false)
      setReady(false)
      if (load) {
        await load()
        setReady(true)
      }
    } catch {
      showToast('Gagal menyimpan rumah', 'danger')
    } finally {
      setRmBusy(false)
    }
  }

  const saveGenerate = async () => {
    if (!pid) return
    const awal = parseInt(genForm.awal)
    const akhir = parseInt(genForm.akhir)
    if (!genForm.blok.trim() || isNaN(awal) || isNaN(akhir) || awal < 1 || akhir < awal) {
      showToast('Isi blok dan rentang nomor yang benar (misal 1–32)', 'warning')
      return
    }
    setGenBusy(true)
    try {
      const rows = []
      for (let n = awal; n <= akhir; n++) {
        rows.push({ perumahan_id: pid, blok: genForm.blok.trim().toUpperCase(), nomor: String(n), tipe: genForm.tipe.trim(), status_huni: 'kosong' })
      }
      const { data, error } = await supabase
        .from('rumah')
        .upsert(rows, { onConflict: 'perumahan_id,blok,nomor', ignoreDuplicates: true })
        .select('id')
      if (error) throw error
      const created = data?.length ?? 0
      showToast(`${created} rumah dibuat · ${rows.length - created} sudah ada`, 'success')
      setGenOpen(false)
      setReady(false)
      if (load) {
        await load()
        setReady(true)
      }
    } catch (e) {
      showToast('Gagal membuat rumah', 'danger')
    } finally {
      setGenBusy(false)
    }
  }

  // ── warga ──────────────────────────────────────────────
  const openWargaModal = (w?: Warga) => {
    setWgEdit(w ?? null)
    setWgForm(
      w
        ? { nama: w.nama, nik: w.nik, no_hp: w.no_hp, status_tinggal: w.status_tinggal, pekerjaan: w.pekerjaan, rumah_id: w.rumah_id ?? '', aktif: w.aktif }
        : emptyWarga
    )
    setWgOpen(true)
  }

  const saveWarga = async () => {
    if (!pid) return
    if (!wgForm.nama.trim()) {
      showToast('Nama wajib diisi', 'warning')
      return
    }
    setWgBusy(true)
    try {
      const payload = {
        nama: wgForm.nama.trim(),
        nik: wgForm.nik.trim(),
        no_hp: wgForm.no_hp.trim(),
        status_tinggal: wgForm.status_tinggal,
        pekerjaan: wgForm.pekerjaan.trim(),
        rumah_id: wgForm.rumah_id || null,
        aktif: wgForm.aktif,
        perumahan_id: pid,
      }
      let error: unknown = null
      if (wgEdit) {
        ;({ error } = await supabase.from('warga').update(payload).eq('id', wgEdit.id))
      } else {
        ;({ error } = await supabase.from('warga').insert(payload))
      }
      if (error) throw error
      showToast(wgEdit ? 'Data warga diperbarui' : 'Warga ditambahkan', 'success')
      setWgOpen(false)
      setReady(false)
      if (load) {
        await load()
        setReady(true)
      }
    } catch {
      showToast('Gagal menyimpan warga', 'danger')
    } finally {
      setWgBusy(false)
    }
  }

  const toggleAktif = async (w: Warga) => {
    await supabase.from('warga').update({ aktif: !w.aktif }).eq('id', w.id)
    showToast(w.aktif ? 'Warga dinonaktifkan' : 'Warga diaktifkan', 'success')
    if (load) await load()
  }

  const doHapus = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      if (confirm.jenis === 'rumah') {
        const { count } = await supabase.from('tagihan').select('id', { count: 'exact' }).eq('rumah_id', confirm.id)
        if (count && count > 0) {
          showToast('Rumah punya tagihan, tidak bisa dihapus', 'warning')
          setConfirm(null)
          return
        }
        await supabase.from('rumah').delete().eq('id', confirm.id)
        showToast('Rumah dihapus', 'success')
      } else {
        await supabase.from('warga').delete().eq('id', confirm.id)
        showToast('Warga dihapus', 'success')
      }
      setConfirm(null)
      setReady(false)
      if (load) {
        await load()
        setReady(true)
      }
    } catch {
      showToast('Gagal menghapus', 'danger')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <div className="tab-page">
      <div className="chip-row" style={{ gap: 8 }}>
        <button className={`chip${tab === 'rumah' ? ' active' : ''}`} onClick={() => setTab('rumah')}>
          🏠 Rumah · {rumah.length}
        </button>
        <button className={`chip${tab === 'warga' ? ' active' : ''}`} onClick={() => setTab('warga')}>
          👥 Warga · {warga.length}
        </button>
      </div>

      <div className="search-wrap">
        <input placeholder={tab === 'rumah' ? 'Cari rumah… (blok, nomor, tipe)' : 'Cari warga…'} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : tab === 'rumah' ? (
        <>
          <div className="row-actions">
            <button className="btn btn-outline" onClick={() => setGenOpen(true)}>
              <span className="mat-icon">apps</span> Generate Rumah
            </button>
            <button className="btn btn-primary" onClick={() => openRumahModal()}>
              <span className="mat-icon">add</span> Tambah Rumah
            </button>
          </div>
          {rumahFiltered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">home</span>
                <p>{search ? 'Tidak ada hasil.' : 'Belum ada rumah. Gunakan "Generate Rumah" atau tambah manual.'}</p>
              </div>
            </div>
          ) : (
            rumahFiltered.map((r) => (
              <div className="card" key={r.id}>
                <div className="card-title">
                  <span className="mat-icon">home</span>
                  <span style={{ fontWeight: 700 }}>
                    {r.blok}
                    {r.nomor}
                  </span>
                  {r.tipe && <span className="badge badge-gray">{r.tipe}</span>}
                  <span className={`badge ${r.status_huni === 'kosong' ? 'badge-gray' : r.status_huni === 'kontrakan' ? 'badge-amber' : 'badge-green'}`}>
                    {STATUS_HUNI[r.status_huni]}
                  </span>
                  <span style={{ marginLeft: 'auto' }} />
                  <span className="badge badge-blue">{wargaByRumah.get(r.id) ?? 0} warga</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-outline" onClick={() => openRumahModal(r)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ jenis: 'rumah', id: r.id, nama: `${r.blok}${r.nomor}` })}>
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <div className="row-actions">
            <button className="btn btn-primary btn-block" onClick={() => openWargaModal()}>
              <span className="mat-icon">person_add</span> Tambah Warga
            </button>
          </div>
          {wargaFiltered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">groups</span>
                <p>{search ? 'Tidak ada hasil.' : 'Belum ada data warga.'}</p>
              </div>
            </div>
          ) : (
            wargaFiltered.map((w) => (
              <div className="card" key={w.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {w.nama}
                      <span className={`badge ${w.aktif ? 'badge-green' : 'badge-gray'}`}>{w.aktif ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      🏠 {rumahLabel(w.rumah_id)} · {STATUS_TINGGAL[w.status_tinggal]}
                      {w.pekerjaan ? ` · ${w.pekerjaan}` : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {w.no_hp || '—'}
                      {w.nik ? ` · NIK ${w.nik}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => openWargaModal(w)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleAktif(w)}>
                      {w.aktif ? 'Nonaktif' : 'Aktif'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ jenis: 'warga', id: w.id, nama: w.nama })}>
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* modal rumah */}
      <Modal
        open={rmOpen}
        onClose={() => setRmOpen(false)}
        title={rmEdit ? 'Edit Rumah' : 'Tambah Rumah'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setRmOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveRumah} disabled={rmBusy}>
              {rmBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Blok</label>
          <input className="form-control" placeholder="contoh: B" value={rmForm.blok} onChange={(e) => setRmForm({ ...rmForm, blok: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Nomor</label>
          <input className="form-control" inputMode="numeric" placeholder="contoh: 3" value={rmForm.nomor} onChange={(e) => setRmForm({ ...rmForm, nomor: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tipe</label>
          <input className="form-control" placeholder="contoh: 45/60" value={rmForm.tipe} onChange={(e) => setRmForm({ ...rmForm, tipe: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={rmForm.status_huni} onChange={(e) => setRmForm({ ...rmForm, status_huni: e.target.value as Rumah['status_huni'] })}>
            <option value="dihuni">Dihuni</option>
            <option value="kosong">Kosong</option>
            <option value="kontrakan">Kontrakan</option>
          </select>
        </div>
      </Modal>

      {/* modal generate massal */}
      <Modal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="Generate Rumah Massal"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setGenOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveGenerate} disabled={genBusy}>
              {genBusy ? '⏳' : 'Buat Sekarang'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
          Buat banyak rumah sekaligus. Yang sudah ada akan dilewati (tidak dobel).
        </p>
        <div className="form-group">
          <label className="form-label">Blok</label>
          <input className="form-control" placeholder="contoh: B" value={genForm.blok} onChange={(e) => setGenForm({ ...genForm, blok: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Nomor Awal</label>
            <input className="form-control" inputMode="numeric" value={genForm.awal} onChange={(e) => setGenForm({ ...genForm, awal: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Nomor Akhir</label>
            <input className="form-control" inputMode="numeric" value={genForm.akhir} onChange={(e) => setGenForm({ ...genForm, akhir: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Tipe (opsional)</label>
          <input className="form-control" placeholder="contoh: 45/60" value={genForm.tipe} onChange={(e) => setGenForm({ ...genForm, tipe: e.target.value })} />
        </div>
      </Modal>

      {/* modal warga */}
      <Modal
        open={wgOpen}
        onClose={() => setWgOpen(false)}
        title={wgEdit ? 'Edit Warga' : 'Tambah Warga'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setWgOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveWarga} disabled={wgBusy}>
              {wgBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama*</label>
          <input className="form-control" value={wgForm.nama} onChange={(e) => setWgForm({ ...wgForm, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">NIK</label>
          <input className="form-control" inputMode="numeric" value={wgForm.nik} onChange={(e) => setWgForm({ ...wgForm, nik: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">No. HP</label>
          <input className="form-control" inputMode="tel" value={wgForm.no_hp} onChange={(e) => setWgForm({ ...wgForm, no_hp: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Rumah</label>
          <select className="form-control" value={wgForm.rumah_id} onChange={(e) => setWgForm({ ...wgForm, rumah_id: e.target.value })}>
            <option value="—">— Belum ada rumah —</option>
            {rumahSorted.map((r) => (
              <option key={r.id} value={r.id}>
                Blok {r.blok} No {r.nomor}
                {r.tipe ? ` (${r.tipe})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status Tinggal</label>
          <select className="form-control" value={wgForm.status_tinggal} onChange={(e) => setWgForm({ ...wgForm, status_tinggal: e.target.value as Warga['status_tinggal'] })}>
            <option value="keluarga">Keluarga</option>
            <option value="pemilik">Pemilik</option>
            <option value="penyewa">Penyewa</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Pekerjaan</label>
          <input className="form-control" value={wgForm.pekerjaan} onChange={(e) => setWgForm({ ...wgForm, pekerjaan: e.target.value })} />
        </div>
      </Modal>

      {/* konfirmasi hapus */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hapus?"
        message={
          confirm?.jenis === 'rumah'
            ? `Hapus rumah ${confirm.nama}? Warga di rumah ini otomatis dilepas.`
            : `Hapus data warga "${confirm?.nama}"?`
        }
        loading={delBusy}
        onConfirm={doHapus}
      />
    </div>
  )
}