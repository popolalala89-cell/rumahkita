import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import { formatRp, formatTanggal } from '../lib/format'
import type { Aset, Pemeliharaan } from '../lib/types'

const KAT_ASET = ['Sarana', 'Prasarana', 'Elektronik', 'Perkantoran', 'Lainnya']
const KONDISI_LABEL: Record<string, { cls: string; label: string }> = {
  baik: { cls: 'badge-green', label: 'Baik' },
  rusak: { cls: 'badge-red', label: 'Rusak' },
  perlu_perbaikan: { cls: 'badge-amber', label: 'Perlu Perbaikan' },
}

export default function AsetPage() {
  const { profile } = useAuth()
  const pid = profile?.perumahan_id

  const [aset, setAset] = useState<Aset[]>([])
  const [pemeliharaan, setPemeliharaan] = useState<Pemeliharaan[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // aset modal
  const [aOpen, setAOpen] = useState(false)
  const [aEdit, setAEdit] = useState<Aset | null>(null)
  const [aForm, setAForm] = useState({ nama: '', kategori: KAT_ASET[0], jumlah: '1', kondisi: 'baik', lokasi: '', tgl_beli: '', harga: '' })
  const [aBusy, setABusy] = useState(false)

  // pemeliharaan modal
  const [pOpen, setPOpen] = useState(false)
  const [pAsetId, setPAsetId] = useState<string | null>(null)
  const [pEdit, setPEdit] = useState<Pemeliharaan | null>(null)
  const [pForm, setPForm] = useState({ jenis: '', biaya: '', tgl: new Date().toISOString().slice(0, 10), keterangan: '' })
  const [pBusy, setPBusy] = useState(false)

  // hapus
  const [confirm, setConfirm] = useState<null | { aksi: 'aset' | 'pemeliharaan'; id: string; nama: string }>(null)
  const [delBusy, setDelBusy] = useState(false)

  const reload = useMemo(() => {
    if (!pid) return
    return async () => {
      const [a, p] = await Promise.all([
        supabase.from('aset').select('*').eq('perumahan_id', pid).order('nama'),
        supabase.from('pemeliharaan').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }),
      ])
      setAset((a.data ?? []) as Aset[])
      setPemeliharaan((p.data ?? []) as Pemeliharaan[])
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

  const riwayat = (asetId: string): Pemeliharaan[] => pemeliharaan.filter((p) => p.aset_id === asetId)
  const totalPemeliharaan = (asetId: string): number => riwayat(asetId).reduce((s, p) => s + (p.biaya || 0), 0)

  // ── Aset ──────────────────────────────────────────
  const openA = (a?: Aset) => {
    setAEdit(a ?? null)
    setAForm(
      a
        ? { nama: a.nama, kategori: a.kategori || KAT_ASET[0], jumlah: String(a.jumlah), kondisi: a.kondisi || 'baik', lokasi: a.lokasi ?? '', tgl_beli: a.tgl_beli ?? '', harga: String(a.harga) }
        : { nama: '', kategori: KAT_ASET[0], jumlah: '1', kondisi: 'baik', lokasi: '', tgl_beli: '', harga: '' }
    )
    setAOpen(true)
  }
  const saveA = async () => {
    if (!pid) return
    if (!aForm.nama.trim()) {
      showToast('Nama aset wajib diisi', 'warning')
      return
    }
    setABusy(true)
    try {
      const payload = {
        nama: aForm.nama.trim(),
        kategori: aForm.kategori,
        jumlah: parseInt(aForm.jumlah) || 1,
        kondisi: aForm.kondisi,
        lokasi: aForm.lokasi.trim(),
        tgl_beli: aForm.tgl_beli || null,
        harga: parseInt(aForm.harga) || 0,
        perumahan_id: pid,
      }
      let error: unknown = null
      if (aEdit) {
        ;({ error } = await supabase.from('aset').update(payload).eq('id', aEdit.id))
      } else {
        ;({ error } = await supabase.from('aset').insert(payload))
      }
      if (error) throw error
      showToast(aEdit ? 'Aset diperbarui' : 'Aset ditambahkan', 'success')
      setAOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan aset', 'danger')
    } finally {
      setABusy(false)
    }
  }

  // ── Pemeliharaan ──────────────────────────────────
  const openP = (asetId: string, p?: Pemeliharaan) => {
    setPAsetId(asetId)
    setPEdit(p ?? null)
    setPForm(
      p
        ? { jenis: p.jenis, biaya: String(p.biaya), tgl: p.tgl, keterangan: p.keterangan ?? '' }
        : { jenis: '', biaya: '', tgl: new Date().toISOString().slice(0, 10), keterangan: '' }
    )
    setPOpen(true)
  }
  const saveP = async () => {
    if (!pid || !pAsetId) return
    if (!pForm.jenis.trim()) {
      showToast('Jenis pemeliharaan wajib diisi', 'warning')
      return
    }
    setPBusy(true)
    try {
      const payload = {
        perumahan_id: pid,
        aset_id: pAsetId,
        jenis: pForm.jenis.trim(),
        biaya: parseInt(pForm.biaya) || 0,
        tgl: pForm.tgl,
        keterangan: pForm.keterangan,
      }
      let error: unknown = null
      if (pEdit) {
        ;({ error } = await supabase.from('pemeliharaan').update(payload).eq('id', pEdit.id))
      } else {
        ;({ error } = await supabase.from('pemeliharaan').insert(payload))
      }
      if (error) throw error
      showToast(pEdit ? 'Pemeliharaan diperbarui' : 'Pemeliharaan dicatat', 'success')
      setPOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan pemeliharaan', 'danger')
    } finally {
      setPBusy(false)
    }
  }

  const doHapus = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      const table = confirm.aksi === 'aset' ? 'aset' : 'pemeliharaan'
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
      <div className="row-actions">
        <button className="btn btn-primary btn-block" onClick={() => openA()}>
          <span className="mat-icon">inventory_2</span> Tambah Aset
        </button>
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : aset.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="mat-icon">inventory_2</span>
            <p>Belum ada aset terdaftar.</p>
          </div>
        </div>
      ) : (
        aset.map((a) => {
          const open = expanded === a.id
          const perawatan = riwayat(a.id)
          const totalNilai = a.harga * a.jumlah
          return (
            <div className="card" key={a.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="li-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <span className="mat-icon">inventory_2</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.nama}
                    {KONDISI_LABEL[a.kondisi] ? <span className={KONDISI_LABEL[a.kondisi].cls}>{KONDISI_LABEL[a.kondisi].label}</span> : null}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {a.kategori}
                    {a.lokasi ? ` · 📍 ${a.lokasi}` : ''}
                    {a.tgl_beli ? ` · 🗓 ${formatTanggal(a.tgl_beli)}` : ''}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {a.jumlah} unit · nilai total {formatRp(totalNilai)}
                    {perawatan.length > 0 ? ` · pemeliharaan ${formatRp(totalPemeliharaan(a.id))}` : ''}
                  </div>
                </div>
                <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => setExpanded(open ? null : a.id)}>
                  {open ? '▲' : '▼'}
                </button>
                <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => openA(a)}>
                  ✏️
                </button>
                <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'aset', id: a.id, nama: a.nama })}>
                  🗑
                </button>
              </div>

              {open && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <b style={{ fontSize: '0.8rem' }}>Riwayat Pemeliharaan</b>
                    <button className="btn btn-sm btn-primary" style={{ minHeight: 30 }} onClick={() => openP(a.id)}>
                      + Catat
                    </button>
                  </div>
                  {perawatan.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Belum ada pemeliharaan.</div>
                  ) : (
                    perawatan.map((p) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.76rem' }}>
                            {p.jenis}
                            {p.biaya > 0 ? ` · ${formatRp(p.biaya)}` : ' · Gratis'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {formatTanggal(p.tgl)}
                            {p.keterangan ? ` · ${p.keterangan}` : ''}
                          </div>
                        </div>
                        <button className="btn btn-sm btn-outline" style={{ minHeight: 28 }} onClick={() => openP(a.id, p)}>
                          ✏️
                        </button>
                        <button className="btn btn-sm btn-danger" style={{ minHeight: 28 }} onClick={() => setConfirm({ aksi: 'pemeliharaan', id: p.id, nama: p.jenis })}>
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* modal aset */}
      <Modal
        open={aOpen}
        onClose={() => setAOpen(false)}
        title={aEdit ? 'Edit Aset' : 'Tambah Aset'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveA} disabled={aBusy}>
              {aBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama Aset*</label>
          <input className="form-control" placeholder="contoh: Meja Balai RT" value={aForm.nama} onChange={(e) => setAForm({ ...aForm, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select className="form-control" value={aForm.kategori} onChange={(e) => setAForm({ ...aForm, kategori: e.target.value })}>
            {KAT_ASET.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Jumlah</label>
            <input className="form-control" inputMode="numeric" value={aForm.jumlah} onChange={(e) => setAForm({ ...aForm, jumlah: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Kondisi</label>
            <select className="form-control" value={aForm.kondisi} onChange={(e) => setAForm({ ...aForm, kondisi: e.target.value })}>
              <option value="baik">Baik</option>
              <option value="perlu_perbaikan">Perlu Perbaikan</option>
              <option value="rusak">Rusak</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Lokasi</label>
            <input className="form-control" placeholder="contoh: Balai RT" value={aForm.lokasi} onChange={(e) => setAForm({ ...aForm, lokasi: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Tgl Beli</label>
            <input className="form-control" type="date" value={aForm.tgl_beli} onChange={(e) => setAForm({ ...aForm, tgl_beli: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Harga per unit (Rp)</label>
          <input className="form-control" inputMode="numeric" value={aForm.harga} onChange={(e) => setAForm({ ...aForm, harga: e.target.value })} />
        </div>
      </Modal>

      {/* modal pemeliharaan */}
      <Modal
        open={pOpen}
        onClose={() => setPOpen(false)}
        title={pEdit ? 'Edit Pemeliharaan' : 'Catat Pemeliharaan'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setPOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveP} disabled={pBusy}>
              {pBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Jenis*</label>
          <input className="form-control" placeholder="contoh: cat ulang, ganti lampu" value={pForm.jenis} onChange={(e) => setPForm({ ...pForm, jenis: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Biaya (Rp, 0 = gratis)</label>
          <input className="form-control" inputMode="numeric" value={pForm.biaya} onChange={(e) => setPForm({ ...pForm, biaya: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-control" type="date" value={pForm.tgl} onChange={(e) => setPForm({ ...pForm, tgl: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Keterangan</label>
          <input className="form-control" value={pForm.keterangan} onChange={(e) => setPForm({ ...pForm, keterangan: e.target.value })} />
        </div>
      </Modal>

      {/* konfirmasi hapus */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hapus?"
        message={confirm?.aksi === 'aset' ? `Hapus aset "${confirm.nama}"? Riwayat pemeliharaannya ikut terhapus.` : `Hapus catatan pemeliharaan "${confirm?.nama}"?`}
        loading={delBusy}
        onConfirm={doHapus}
      />
    </div>
  )
}