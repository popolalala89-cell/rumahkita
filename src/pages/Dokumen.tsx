import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import { formatTanggal } from '../lib/format'
import type { DokumenTabel, KontakPenting } from '../lib/types'

type Tab = 'dokumen' | 'kontak'

const KAT_DOKUMEN = ['AD/ART', 'Notulensi', 'Keuangan', 'Surat', 'Lainnya']
const KAT_KONTAK = ['Pengurus', 'Keamanan', 'Kesehatan', 'Darurat', 'Lainnya']

export default function DokumenPage() {
  const { profile, hasRole } = useAuth()
  const pid = profile?.perumahan_id
  const isPengurus = hasRole('ketua', 'bendahara', 'sekretaris')

  const [tab, setTab] = useState<Tab>('dokumen')
  const [dokumen, setDokumen] = useState<DokumenTabel[]>([])
  const [kontak, setKontak] = useState<KontakPenting[]>([])
  const [ready, setReady] = useState(false)

  // dokumen modal
  const [dOpen, setDOpen] = useState(false)
  const [dEdit, setDEdit] = useState<DokumenTabel | null>(null)
  const [dForm, setDForm] = useState({ judul: '', kategori: KAT_DOKUMEN[0], file_url: '' })
  const [dBusy, setDBusy] = useState(false)

  // kontak modal
  const [kOpen, setKOpen] = useState(false)
  const [kEdit, setKEdit] = useState<KontakPenting | null>(null)
  const [kForm, setKForm] = useState({ nama: '', kategori: KAT_KONTAK[0], no_hp: '', alamat: '' })
  const [kBusy, setKBusy] = useState(false)

  // hapus
  const [confirm, setConfirm] = useState<null | { aksi: 'dokumen' | 'kontak'; id: string; nama: string }>(null)
  const [delBusy, setDelBusy] = useState(false)

  const reload = useMemo(() => {
    if (!pid) return
    return async () => {
      const [d, k] = await Promise.all([
        supabase.from('dokumen').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }),
        supabase.from('kontak_penting').select('*').eq('perumahan_id', pid).order('nama'),
      ])
      setDokumen((d.data ?? []) as DokumenTabel[])
      setKontak((k.data ?? []) as KontakPenting[])
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

  // ── Dokumen ───────────────────────────────────────
  const openD = (d?: DokumenTabel) => {
    setDEdit(d ?? null)
    setDForm(d ? { judul: d.judul, kategori: d.kategori || KAT_DOKUMEN[0], file_url: d.file_url ?? '' } : { judul: '', kategori: KAT_DOKUMEN[0], file_url: '' })
    setDOpen(true)
  }
  const saveD = async () => {
    if (!pid) return
    if (!dForm.judul.trim()) {
      showToast('Judul dokumen wajib diisi', 'warning')
      return
    }
    setDBusy(true)
    try {
      const payload = {
        judul: dForm.judul.trim(),
        kategori: dForm.kategori,
        file_url: dForm.file_url.trim() || null,
        perumahan_id: pid,
      }
      let error: unknown = null
      if (dEdit) {
        ;({ error } = await supabase.from('dokumen').update(payload).eq('id', dEdit.id))
      } else {
        ;({ error } = await supabase.from('dokumen').insert({ ...payload, tgl: new Date().toISOString().slice(0, 10) }))
      }
      if (error) throw error
      showToast(dEdit ? 'Dokumen diperbarui' : 'Dokumen diunggah', 'success')
      setDOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan dokumen', 'danger')
    } finally {
      setDBusy(false)
    }
  }

  // ── Kontak ────────────────────────────────────────
  const openK = (k?: KontakPenting) => {
    setKEdit(k ?? null)
    setKForm(k ? { nama: k.nama, kategori: k.kategori || KAT_KONTAK[0], no_hp: k.no_hp ?? '', alamat: k.alamat ?? '' } : { nama: '', kategori: KAT_KONTAK[0], no_hp: '', alamat: '' })
    setKOpen(true)
  }
  const saveK = async () => {
    if (!pid) return
    if (!kForm.nama.trim()) {
      showToast('Nama kontak wajib diisi', 'warning')
      return
    }
    setKBusy(true)
    try {
      const payload = {
        nama: kForm.nama.trim(),
        kategori: kForm.kategori,
        no_hp: kForm.no_hp.trim(),
        alamat: kForm.alamat.trim(),
        perumahan_id: pid,
      }
      let error: unknown = null
      if (kEdit) {
        ;({ error } = await supabase.from('kontak_penting').update(payload).eq('id', kEdit.id))
      } else {
        ;({ error } = await supabase.from('kontak_penting').insert(payload))
      }
      if (error) throw error
      showToast(kEdit ? 'Kontak diperbarui' : 'Kontak ditambahkan', 'success')
      setKOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan kontak', 'danger')
    } finally {
      setKBusy(false)
    }
  }

  const doHapus = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      const table = confirm.aksi === 'dokumen' ? 'dokumen' : 'kontak_penting'
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
        <button className={`chip${tab === 'dokumen' ? ' active' : ''}`} onClick={() => setTab('dokumen')}>
          📁 Dokumen
        </button>
        <button className={`chip${tab === 'kontak' ? ' active' : ''}`} onClick={() => setTab('kontak')}>
          📞 Kontak Penting
        </button>
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : tab === 'dokumen' ? (
        <>
          {isPengurus && (
            <div className="row-actions">
              <button className="btn btn-primary btn-block" onClick={() => openD()}>
                <span className="mat-icon">upload_file</span> Tambah Dokumen
              </button>
            </div>
          )}
          {dokumen.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">folder_open</span>
                <p>Belum ada dokumen.</p>
              </div>
            </div>
          ) : (
            dokumen.map((d) => (
              <div className="card" key={d.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="li-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <span className="mat-icon">description</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {d.judul}
                      {d.kategori && <span className="badge badge-blue">{d.kategori}</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatTanggal(d.tgl)}</div>
                  </div>
                  {d.file_url && (
                    <a className="btn btn-sm btn-outline" style={{ minHeight: 32, textDecoration: 'none' }} href={d.file_url} target="_blank" rel="noreferrer">
                      📄 Buka
                    </a>
                  )}
                  {isPengurus && (
                    <>
                      <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => openD(d)}>
                        ✏️
                      </button>
                      <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'dokumen', id: d.id, nama: d.judul })}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          {isPengurus && (
            <div className="row-actions">
              <button className="btn btn-primary btn-block" onClick={() => openK()}>
                <span className="mat-icon">contact_phone</span> Tambah Kontak
              </button>
            </div>
          )}
          {kontak.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">contact_phone</span>
                <p>Belum ada kontak penting.</p>
              </div>
            </div>
          ) : (
            kontak.map((k) => (
              <div className="card" key={k.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="li-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                    <span className="mat-icon">call</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {k.nama}
                      {k.kategori && <span className="badge badge-amber">{k.kategori}</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {k.alamat || '—'}
                    </div>
                  </div>
                  {k.no_hp && (
                    <a className="btn btn-sm btn-primary" style={{ minHeight: 32, textDecoration: 'none' }} href={`tel:${k.no_hp}`}>
                      📞
                    </a>
                  )}
                  {isPengurus && (
                    <>
                      <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => openK(k)}>
                        ✏️
                      </button>
                      <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'kontak', id: k.id, nama: k.nama })}>
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* modal dokumen */}
      <Modal
        open={dOpen}
        onClose={() => setDOpen(false)}
        title={dEdit ? 'Edit Dokumen' : 'Tambah Dokumen'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveD} disabled={dBusy}>
              {dBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Judul*</label>
          <input className="form-control" placeholder="contoh: Notulensi Rapat Juli 2026" value={dForm.judul} onChange={(e) => setDForm({ ...dForm, judul: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select className="form-control" value={dForm.kategori} onChange={(e) => setDForm({ ...dForm, kategori: e.target.value })}>
            {KAT_DOKUMEN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Link file (Drive / upload lain)</label>
          <input className="form-control" placeholder="https://drive.google.com/..." value={dForm.file_url} onChange={(e) => setDForm({ ...dForm, file_url: e.target.value })} />
        </div>
      </Modal>

      {/* modal kontak */}
      <Modal
        open={kOpen}
        onClose={() => setKOpen(false)}
        title={kEdit ? 'Edit Kontak' : 'Tambah Kontak'}
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
          <label className="form-label">Nama*</label>
          <input className="form-control" placeholder="contoh: Pos Kamling" value={kForm.nama} onChange={(e) => setKForm({ ...kForm, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select className="form-control" value={kForm.kategori} onChange={(e) => setKForm({ ...kForm, kategori: e.target.value })}>
            {KAT_KONTAK.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">No. HP</label>
          <input className="form-control" inputMode="tel" value={kForm.no_hp} onChange={(e) => setKForm({ ...kForm, no_hp: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Alamat</label>
          <input className="form-control" value={kForm.alamat} onChange={(e) => setKForm({ ...kForm, alamat: e.target.value })} />
        </div>
      </Modal>

      {/* konfirmasi hapus */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hapus?"
        message={`Hapus ${confirm?.aksi === 'dokumen' ? 'dokumen' : 'kontak'} "${confirm?.nama}"?`}
        loading={delBusy}
        onConfirm={doHapus}
      />
    </div>
  )
}