import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import { formatTanggal } from '../lib/format'
import type { BukuTamu, KendaraanLog, Rumah } from '../lib/types'

type Tab = 'tamu' | 'kendaraan'
const nowHHMM = () => new Date().toTimeString().slice(0, 5)

export default function KeamananPage() {
  const { profile, user } = useAuth()
  const pid = profile?.perumahan_id

  const [tab, setTab] = useState<Tab>('tamu')
  const [tamu, setTamu] = useState<BukuTamu[]>([])
  const [kendaraan, setKendaraan] = useState<KendaraanLog[]>([])
  const [rumah, setRumah] = useState<Rumah[]>([])
  const [filter, setFilter] = useState<'semua' | 'dalam'>('semua')
  const [ready, setReady] = useState(false)

  // tamu modal
  const [tOpen, setTOpen] = useState(false)
  const [tEdit, setTEdit] = useState<BukuTamu | null>(null)
  const [tForm, setTForm] = useState({ nama: '', tujuan_rumah_id: '', keperluan: '' })
  const [tBusy, setTBusy] = useState(false)

  // kendaraan modal
  const [kOpen, setKOpen] = useState(false)
  const [kArah, setKArah] = useState<'masuk' | 'keluar'>('masuk')
  const [kForm, setKForm] = useState({ plat: '', jenis: '' })
  const [kBusy, setKBusy] = useState(false)

  // hapus
  const [confirm, setConfirm] = useState<null | { aksi: 'tamu' | 'kendaraan'; id: string; nama: string }>(null)
  const [delBusy, setDelBusy] = useState(false)

  const reload = useMemo(() => {
    if (!pid) return
    return async () => {
      const [t, k, r] = await Promise.all([
        supabase.from('buku_tamu').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }).order('created_at', { ascending: false }).limit(200),
        supabase.from('kendaraan_log').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }).order('created_at', { ascending: false }).limit(200),
        supabase.from('rumah').select('*').eq('perumahan_id', pid),
      ])
      setTamu((t.data ?? []) as BukuTamu[])
      setKendaraan((k.data ?? []) as KendaraanLog[])
      setRumah((r.data ?? []) as Rumah[])
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

  const rumahLabel = (id: string | null): string => {
    if (!id) return 'Umum'
    const r = rumah.find((x) => x.id === id)
    return r ? `${r.blok}${r.nomor}` : '—'
  }
  const tamuFiltered = useMemo(() => {
    if (filter === 'semua') return tamu
    return tamu.filter((t) => !t.jam_keluar)
  }, [tamu, filter])

  // ── Tamu ──────────────────────────────────────────
  const openT = (t?: BukuTamu) => {
    setTEdit(t ?? null)
    setTForm(t ? { nama: t.nama, tujuan_rumah_id: t.tujuan_rumah_id ?? '', keperluan: t.keperluan ?? '' } : { nama: '', tujuan_rumah_id: '', keperluan: '' })
    setTOpen(true)
  }
  const saveT = async () => {
    if (!pid) return
    if (!tForm.nama.trim()) {
      showToast('Nama tamu wajib diisi', 'warning')
      return
    }
    setTBusy(true)
    try {
      const payload = {
        perumahan_id: pid,
        nama: tForm.nama.trim(),
        tujuan_rumah_id: tForm.tujuan_rumah_id || null,
        keperluan: tForm.keperluan,
        petugas_id: user?.id ?? null,
      }
      let error: unknown = null
      if (tEdit) {
        ;({ error } = await supabase.from('buku_tamu').update(payload).eq('id', tEdit.id))
      } else {
        ;({ error } = await supabase.from('buku_tamu').insert({ ...payload, tgl: new Date().toISOString().slice(0, 10), jam_masuk: nowHHMM() }))
      }
      if (error) throw error
      showToast(tEdit ? 'Daftar tamu diperbarui' : 'Tamu dicatat ✓', 'success')
      setTOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan tamu', 'danger')
    } finally {
      setTBusy(false)
    }
  }
  const tamuKeluar = async (t: BukuTamu) => {
    await supabase.from('buku_tamu').update({ jam_keluar: t.jam_keluar ? null : nowHHMM() }).eq('id', t.id)
    showToast(t.jam_keluar ? 'Jam keluar dibatalkan' : `Tamu keluar ${nowHHMM()}`, 'success')
    if (reload) await reload()
  }

  // ── Kendaraan ─────────────────────────────────────
  const openK = (arah: 'masuk' | 'keluar') => {
    setKArah(arah)
    setKForm({ plat: '', jenis: '' })
    setKOpen(true)
  }
  const saveK = async () => {
    if (!pid) return
    if (!kForm.plat.trim()) {
      showToast('No. plat wajib diisi', 'warning')
      return
    }
    setKBusy(true)
    try {
      const { error } = await supabase.from('kendaraan_log').insert({
        perumahan_id: pid,
        plat: kForm.plat.trim().toUpperCase(),
        jenis: kForm.jenis,
        arah: kArah,
        jam: nowHHMM(),
        tgl: new Date().toISOString().slice(0, 10),
        petugas_id: user?.id ?? null,
      })
      if (error) throw error
      showToast(`Kendaraan ${kArah} dicatat ✓`, 'success')
      setKOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal mencatat kendaraan', 'danger')
    } finally {
      setKBusy(false)
    }
  }

  const doHapus = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      const table = confirm.aksi === 'tamu' ? 'buku_tamu' : 'kendaraan_log'
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
        <button className={`chip${tab === 'tamu' ? ' active' : ''}`} onClick={() => setTab('tamu')}>
          👥 Buku Tamu
        </button>
        <button className={`chip${tab === 'kendaraan' ? ' active' : ''}`} onClick={() => setTab('kendaraan')}>
          🚗 Kendaraan
        </button>
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : tab === 'tamu' ? (
        <>
          <div className="card" style={{ padding: 14 }}>
            <div className="row-actions" style={{ marginBottom: 0 }}>
              <button className="btn btn-primary btn-block" onClick={() => openT()}>
                <span className="mat-icon">person_add</span> Catat Tamu
              </button>
            </div>
          </div>
          <div className="chip-row">
            <button className={`chip${filter === 'semua' ? ' active' : ''}`} onClick={() => setFilter('semua')}>
              Semua
            </button>
            <button className={`chip${filter === 'dalam' ? ' active' : ''}`} onClick={() => setFilter('dalam')}>
              Masih di area ({tamu.filter((t) => !t.jam_keluar).length})
            </button>
          </div>
          {tamuFiltered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">contacts</span>
                <p>Belum ada catatan tamu.</p>
              </div>
            </div>
          ) : (
            tamuFiltered.map((t) => {
              const diDalam = !t.jam_keluar
              return (
                <div className="card" key={t.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      className="li-icon"
                      style={{ background: diDalam ? '#fef3c7' : '#dcfce7', color: diDalam ? 'var(--warning)' : 'var(--success)' }}
                    >
                      <span className="mat-icon">{diDalam ? 'login' : 'logout'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.nama}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {formatTanggal(t.tgl)} · Masuk {t.jam_masuk}
                        {t.jam_keluar ? ` · Keluar ${t.jam_keluar}` : diDalam ? ' · Di dalam' : ''}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        🏠 {rumahLabel(t.tujuan_rumah_id)}
                        {t.keperluan ? ` · ${t.keperluan}` : ''}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => tamuKeluar(t)}>
                      {diDalam ? 'Keluar' : 'Msk lg'}
                    </button>
                    <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => openT(t)}>
                      ✏️
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'tamu', id: t.id, nama: t.nama })}>
                      🗑
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </>
      ) : (
        <>
          <div className="card" style={{ padding: 14 }}>
            <div className="row-actions" style={{ marginBottom: 0 }}>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => openK('masuk')}>
                <span className="mat-icon">login</span> Masuk
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => openK('keluar')}>
                <span className="mat-icon">logout</span> Keluar
              </button>
            </div>
          </div>
          {kendaraan.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="mat-icon">directions_car</span>
                <p>Belum ada catatan kendaraan.</p>
              </div>
            </div>
          ) : (
            kendaraan.map((k) => (
              <div className="card" key={k.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    className="li-icon"
                    style={{ background: k.arah === 'masuk' ? '#dcfce7' : '#fee2e2', color: k.arah === 'masuk' ? 'var(--success)' : 'var(--danger)' }}
                  >
                    <span className="mat-icon">directions_car</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', letterSpacing: 0.5 }}>{k.plat}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {formatTanggal(k.tgl)} · {k.jam}
                      {k.jenis ? ` · ${k.jenis}` : ''}
                    </div>
                  </div>
                  <span className={k.arah === 'masuk' ? 'badge badge-green' : 'badge badge-red'}>
                    {k.arah === 'masuk' ? 'MASUK' : 'KELUAR'}
                  </span>
                  <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'kendaraan', id: k.id, nama: k.plat })}>
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* modal tamu */}
      <Modal
        open={tOpen}
        onClose={() => setTOpen(false)}
        title={tEdit ? 'Edit Catatan Tamu' : 'Catat Tamu'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setTOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveT} disabled={tBusy}>
              {tBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama Tamu*</label>
          <input className="form-control" value={tForm.nama} onChange={(e) => setTForm({ ...tForm, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tujuan Rumah</label>
          <select className="form-control" value={tForm.tujuan_rumah_id} onChange={(e) => setTForm({ ...tForm, tujuan_rumah_id: e.target.value })}>
            <option value="">— Umum / tidak tahu —</option>
            {rumah.map((r) => (
              <option key={r.id} value={r.id}>
                {r.blok}{r.nomor}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Keperluan</label>
          <input className="form-control" value={tForm.keperluan} onChange={(e) => setTForm({ ...tForm, keperluan: e.target.value })} />
        </div>
      </Modal>

      {/* modal kendaraan */}
      <Modal
        open={kOpen}
        onClose={() => setKOpen(false)}
        title={kArah === 'masuk' ? 'Kendaraan Masuk' : 'Kendaraan Keluar'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setKOpen(false)}>
              Batal
            </button>
            <button className={`btn ${kArah === 'masuk' ? 'btn-success' : 'btn-danger'}`} onClick={saveK} disabled={kBusy}>
              {kBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">No. Plat*</label>
          <input className="form-control" placeholder="contoh: B 1234 XYZ" value={kForm.plat} onChange={(e) => setKForm({ ...kForm, plat: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Jenis kendaraan</label>
          <select className="form-control" value={kForm.jenis} onChange={(e) => setKForm({ ...kForm, jenis: e.target.value })}>
            <option value="">— Pilih —</option>
            {['Mobil', 'Motor', 'Truk', 'Lainnya'].map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
      </Modal>

      {/* konfirmasi hapus */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hapus?"
        message={confirm?.aksi === 'tamu' ? `Hapus catatan tamu "${confirm.nama}"?` : `Hapus catatan kendaraan ${confirm?.nama}?`}
        loading={delBusy}
        onConfirm={doHapus}
      />
    </div>
  )
}