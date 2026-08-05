import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import { formatRp, formatTanggal } from '../lib/format'
import { downloadExcel } from '../lib/exportExcel'
import { insertKas, hapusKasByTagihan } from '../lib/kas'
import { waShare } from '../lib/wa'
import type { IuranJenis, Pembayaran, Rumah, Tagihan } from '../lib/types'

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()
const TAHUN_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

const emptyJenis = { nama: '', nominal: '', aktif: true }

export default function IuranPage() {
  const { profile, user } = useAuth()
  const pid = profile?.perumahan_id

  const [jenis, setJenis] = useState<IuranJenis[]>([])
  const [rumah, setRumah] = useState<Rumah[]>([])
  const [tagihan, setTagihan] = useState<Tagihan[]>([])
  const [paymentMap, setPaymentMap] = useState<Map<string, Pembayaran>>(new Map())
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [ready, setReady] = useState(false)
  const [filterJenis, setFilterJenis] = useState<string>('semua')

  // modal jenis iuran
  const [jOpen, setJOpen] = useState(false)
  const [jEdit, setJEdit] = useState<IuranJenis | null>(null)
  const [jForm, setJForm] = useState(emptyJenis)
  const [jBusy, setJBusy] = useState(false)

  // generate tagihan
  const [genOpen, setGenOpen] = useState(false)
  const [genBusy, setGenBusy] = useState(false)

  // bayar
  const [bayar, setBayar] = useState<Tagihan | null>(null)
  const [bForm, setBForm] = useState({ nominal: '', tgl: '', metode: 'tunai', catatan: '' })
  const [bBusy, setBBusy] = useState(false)

  // konfirmasi
  const [confirm, setConfirm] = useState<null | { aksi: 'hapus' | 'batalkan' | 'hapusJenis'; tagihan?: Tagihan; jenis?: IuranJenis }>(null)
  const [delBusy, setDelBusy] = useState(false)

  const reload = useMemo(() => {
    if (!pid) return
    return async () => {
      const [j, r, t] = await Promise.all([
        supabase.from('iuran_jenis').select('*').eq('perumahan_id', pid).order('nama'),
        supabase.from('rumah').select('*').eq('perumahan_id', pid),
        supabase.from('tagihan').select('*').eq('perumahan_id', pid).eq('bulan', bulan).eq('tahun', tahun),
      ])
      const jenisList = (j.data ?? []) as IuranJenis[]
      const rumahList = (r.data ?? []) as Rumah[]
      const tagihanList = (t.data ?? []) as Tagihan[]
      let pm = new Map<string, Pembayaran>()
      if (tagihanList.length > 0) {
        const ids = tagihanList.map((x) => x.id)
        const { data: pays } = await supabase.from('pembayaran').select('*').in('tagihan_id', ids)
        pm = new Map(((pays ?? []) as Pembayaran[]).map((p) => [p.tagihan_id, p]))
      }
      setJenis(jenisList)
      setRumah(rumahList)
      setTagihan(tagihanList)
      setPaymentMap(pm)
    }
  }, [pid, bulan, tahun]) as (() => void) | undefined

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

  const rumahLabel = (id: string): string => {
    const r = rumah.find((x) => x.id === id)
    return r ? `${r.blok}${r.nomor}` : '—'
  }

  // ── preview generate ────────────────────────────────
  const targetRumah = useMemo(() => rumah.filter((r) => r.status_huni !== 'kosong'), [rumah])
  const aktifJenis = useMemo(() => jenis.filter((j) => j.aktif), [jenis])
  const previewCount = targetRumah.length * aktifJenis.length

  const tagihanFiltered = useMemo(() => {
    if (filterJenis === 'semua') return tagihan
    return tagihan.filter((t) => t.iuran_jenis_id === filterJenis)
  }, [tagihan, filterJenis])

  const rekap = useMemo(() => {
    const lunas = tagihan.filter((t) => t.status === 'lunas')
    return {
      total: tagihan.length,
      lunas: lunas.length,
      belum: tagihan.length - lunas.length,
      terkumpul: lunas.reduce((s, t) => s + t.nominal, 0),
    }
  }, [tagihan])

  // ── jenis iuran ─────────────────────────────────────
  const openJenisModal = (j?: IuranJenis) => {
    setJEdit(j ?? null)
    setJForm(j ? { nama: j.nama, nominal: String(j.nominal), aktif: j.aktif } : emptyJenis)
    setJOpen(true)
  }

  const saveJenis = async () => {
    if (!pid) return
    const nominal = parseInt(jForm.nominal)
    if (!jForm.nama.trim() || isNaN(nominal) || nominal <= 0) {
      showToast('Isi nama dan nominal dengan benar', 'warning')
      return
    }
    setJBusy(true)
    try {
      const payload = { nama: jForm.nama.trim(), nominal, aktif: jForm.aktif, perumahan_id: pid }
      let error: unknown = null
      if (jEdit) {
        ;({ error } = await supabase.from('iuran_jenis').update(payload).eq('id', jEdit.id))
      } else {
        ;({ error } = await supabase.from('iuran_jenis').insert(payload))
      }
      if (error) throw error
      showToast(jEdit ? 'Jenis iuran diperbarui' : 'Jenis iuran ditambahkan', 'success')
      setJOpen(false)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan jenis iuran', 'danger')
    } finally {
      setJBusy(false)
    }
  }

  const toggleJenisAktif = async (j: IuranJenis) => {
    await supabase.from('iuran_jenis').update({ aktif: !j.aktif }).eq('id', j.id)
    showToast(j.aktif ? 'Jenis iuran dinonaktifkan' : 'Jenis iuran diaktifkan', 'success')
    if (reload) await reload()
  }

  // ── generate tagihan ────────────────────────────────
  const doGenerate = async () => {
    if (!pid || previewCount === 0) return
    setGenBusy(true)
    try {
      const rows: Record<string, unknown>[] = []
      for (const r of targetRumah) {
        for (const j of aktifJenis) {
          rows.push({ perumahan_id: pid, rumah_id: r.id, iuran_jenis_id: j.id, bulan, tahun, nominal: j.nominal, status: 'belum' })
        }
      }
      const { data, error } = await supabase
        .from('tagihan')
        .upsert(rows, { onConflict: 'perumahan_id,rumah_id,iuran_jenis_id,bulan,tahun', ignoreDuplicates: true })
        .select('id')
      if (error) throw error
      const created = data?.length ?? 0
      showToast(`${created} tagihan dibuat · ${rows.length - created} sudah ada`, 'success')
      setGenOpen(false)
      if (reload) await reload()
    } catch (e) {
      showToast('Gagal generate tagihan', 'danger')
    } finally {
      setGenBusy(false)
    }
  }

  // ── bayar ───────────────────────────────────────────
  const openBayar = (t: Tagihan) => {
    setBayar(t)
    setBForm({ nominal: String(t.nominal), tgl: new Date().toISOString().slice(0, 10), metode: 'tunai', catatan: '' })
  }

  const saveBayar = async () => {
    if (!pid || !bayar) return
    const nominal = parseInt(bForm.nominal)
    if (isNaN(nominal) || nominal <= 0) {
      showToast('Nominal tidak valid', 'warning')
      return
    }
    setBBusy(true)
    try {
      const { error: pe } = await supabase.from('pembayaran').insert({
        perumahan_id: pid,
        tagihan_id: bayar.id,
        tgl: bForm.tgl,
        nominal,
        metode: bForm.metode,
        catatan: bForm.catatan,
        user_id: user?.id ?? null,
      })
      if (pe) throw pe
      const { error: te } = await supabase.from('tagihan').update({ status: 'lunas' }).eq('id', bayar.id)
      if (te) throw te

      const iuran = jenis.find((j) => j.id === bayar.iuran_jenis_id)
      const kasErr = await insertKas({
        perumahan_id: pid,
        tgl: bForm.tgl,
        jenis: 'masuk',
        kategori: `Iuran ${iuran?.nama ?? ''}`.trim(),
        nominal,
        keterangan: `Pembayaran ${rumahLabel(bayar.rumah_id)} · ${NAMA_BULAN[bulan - 1]} ${tahun}`,
        user_id: user?.id ?? null,
        sumber: `pembayaran:${bayar.id}`,
      })
      showToast('Pembayaran dicatat ✓', 'success')
      if (kasErr) showToast('Gagal catat ke kas (jalankan fase1_alter.sql?)', 'warning')
      setBayar(null)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan pembayaran', 'danger')
    } finally {
      setBBusy(false)
    }
  }

  // ── hapus / batalkan ────────────────────────────────
  const doConfirm = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      if (confirm.aksi === 'hapusJenis' && confirm.jenis) {
        const { count } = await supabase.from('tagihan').select('id', { count: 'exact' }).eq('iuran_jenis_id', confirm.jenis.id)
        if (count && count > 0) {
          showToast('Jenis iuran sudah dipakai tagihan, tidak bisa dihapus', 'warning')
          setConfirm(null)
          return
        }
        await supabase.from('iuran_jenis').delete().eq('id', confirm.jenis.id)
        showToast('Jenis iuran dihapus', 'success')
      } else if (confirm.aksi === 'hapus' && confirm.tagihan) {
        await supabase.from('tagihan').delete().eq('id', confirm.tagihan.id)
        showToast('Tagihan dihapus', 'success')
      } else if (confirm.aksi === 'batalkan' && confirm.tagihan && pid) {
        await supabase.from('pembayaran').delete().eq('tagihan_id', confirm.tagihan.id)
        await hapusKasByTagihan(pid, confirm.tagihan.id)
        await supabase.from('tagihan').update({ status: 'belum' }).eq('id', confirm.tagihan.id)
        showToast('Pembayaran dibatalkan, kas dikembalikan', 'success')
      }
      setConfirm(null)
      if (reload) await reload()
    } catch {
      showToast('Gagal, coba lagi', 'danger')
    } finally {
      setDelBusy(false)
    }
  }

  // ── share rekap tagihan via WhatsApp ───────────────
  const shareTagihanWA = () => {
    if (tagihan.length === 0) {
      showToast('Belum ada tagihan untuk dibagikan', 'warning')
      return
    }
    const belum = tagihan.filter((t) => t.status === 'belum')
    const lunas = tagihan.length - belum.length
    const total = tagihan.reduce((s, t) => s + t.nominal, 0)
    const terkumpul = tagihan.filter((t) => t.status === 'lunas').reduce((s, t) => s + t.nominal, 0)
    const periode = `${NAMA_BULAN[bulan - 1]} ${tahun}`
    let msg = `*INFO IURAN ${periode.toUpperCase()}*\n`
    msg += `Total tagihan: ${tagihan.length} rumah\n`
    msg += `Sudah bayar: ${lunas}\n`
    msg += `Belum bayar: ${belum.length}\n\n`
    msg += `💰 Terkumpul: ${formatRp(terkumpul)} dari ${formatRp(total)}\n`
    if (belum.length > 0) {
      msg += `\nMohon segera bayar iuran ${periode}:\n`
      belum.slice(0, 15).forEach((t) => {
        const j = jenis.find((x) => x.id === t.iuran_jenis_id)
        msg += `• ${rumahLabel(t.rumah_id)} — ${j?.nama ?? ''} ${formatRp(t.nominal)}\n`
      })
      if (belum.length > 15) msg += `...dan ${belum.length - 15} tagihan lainnya\n`
    }
    msg += `\nTerima kasih 🙏`
    waShare(msg)
  }

  // ── export excel ────────────────────────────────────
  const exportExcel = () => {
    const rows = tagihan.map((t) => {
      const j = jenis.find((x) => x.id === t.iuran_jenis_id)
      const p = paymentMap.get(t.id)
      return {
        Blok: rumahLabel(t.rumah_id).replace(/\d+$/, ''),
        Nomor: rumahLabel(t.rumah_id).replace(/^[A-Za-z]+/, ''),
        'Jenis Iuran': j?.nama ?? '',
        'Nominal (Rp)': t.nominal,
        Denda: t.denda,
        Status: t.status === 'lunas' ? 'Lunas' : 'Belum',
        'Tanggal Bayar': p?.tgl ?? '',
        Metode: p?.metode ?? '',
      }
    })
    const rekapRows = jenis.map((j) => {
      const ts = tagihan.filter((t) => t.iuran_jenis_id === j.id)
      const lunas = ts.filter((t) => t.status === 'lunas')
      return {
        'Jenis Iuran': j.nama,
        Jumlah: ts.length,
        Lunas: lunas.length,
        Belum: ts.length - lunas.length,
        'Total Tagihan (Rp)': ts.reduce((s, t) => s + t.nominal, 0),
        'Terkumpul (Rp)': lunas.reduce((s, t) => s + t.nominal, 0),
      }
    })
    downloadExcel(`Laporan Tagihan ${NAMA_BULAN[bulan - 1]} ${tahun}.xlsx`, [
      { name: 'Tagihan', rows },
      { name: 'Rekap per Jenis', rows: rekapRows },
    ])
    showToast('File Excel diunduh', 'success')
  }

  return (
    <div className="tab-page">
      {/* jenis iuran */}
      <div className="section-title">
        <span>💳 Jenis Iuran</span>
        <button className="btn btn-sm btn-primary" onClick={() => openJenisModal()}>
          <span className="mat-icon" style={{ fontSize: 16 }}>add</span> Tambah
        </button>
      </div>
      {jenis.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="mat-icon">payments</span>
            <p>Belum ada jenis iuran. Tambahkan dulu, lalu generate tagihan.</p>
          </div>
        </div>
      ) : (
        <div className="chip-row">
          {jenis.map((j) => (
            <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                className="chip"
                style={j.aktif ? undefined : { background: 'var(--surface-variant)', color: 'var(--text-muted)', borderColor: 'var(--border)', textDecoration: 'line-through' }}
              >
                {j.nama} · {formatRp(j.nominal)}
              </span>
              <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => openJenisModal(j)}>
                ✏️
              </button>
              <button className="btn btn-sm btn-outline" style={{ minHeight: 32 }} onClick={() => toggleJenisAktif(j)}>
                {j.aktif ? '⏸' : '▶️'}
              </button>
              <button className="btn btn-sm btn-danger" style={{ minHeight: 32 }} onClick={() => setConfirm({ aksi: 'hapusJenis', jenis: j })}>
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {/* kontrol tagihan */}
      <div className="section-title">
        <span>🧾 Tagihan Bulanan</span>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Bulan</label>
            <select className="form-control" value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))}>
              {NAMA_BULAN.map((b, i) => (
                <option key={b} value={i + 1}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Tahun</label>
            <select className="form-control" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))}>
              {TAHUN_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row-actions" style={{ marginTop: 12, marginBottom: 0 }}>
          <button className="btn btn-outline" onClick={exportExcel}>
            <span className="mat-icon">file_download</span> Excel
          </button>
          <button className="btn btn-outline" onClick={shareTagihanWA} disabled={tagihan.length === 0}>
            <span className="mat-icon">chat</span> WA
          </button>
          <button className="btn btn-primary" onClick={() => setGenOpen(true)} disabled={previewCount === 0}>
            <span className="mat-icon">auto_awesome</span> Generate {bulan}/{tahun}
          </button>
        </div>
      </div>

      {/* rekap */}
      {tagihan.length > 0 && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Tagihan</div>
            <div className="stat-value">{rekap.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Lunas</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{rekap.lunas}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Belum</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{rekap.belum}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Terkumpul</div>
            <div className="stat-value">{formatRp(rekap.terkumpul)}</div>
          </div>
        </div>
      )}

      {/* filter jenis */}
      {tagihan.length > 1 && (
        <div className="chip-row">
          <button className={`chip${filterJenis === 'semua' ? ' active' : ''}`} onClick={() => setFilterJenis('semua')}>
            Semua
          </button>
          {jenis.map((j) => (
            <button key={j.id} className={`chip${filterJenis === j.id ? ' active' : ''}`} onClick={() => setFilterJenis(j.id)}>
              {j.nama}
            </button>
          ))}
        </div>
      )}

      {/* daftar tagihan */}
      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '20dvh' }}>
          <div className="spinner" />
        </div>
      ) : tagihanFiltered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="mat-icon">receipt_long</span>
            <p>Belum ada tagihan {NAMA_BULAN[bulan - 1]} {tahun}. Klik Generate untuk membuat dari semua rumah dihuni × jenis iuran aktif.</p>
          </div>
        </div>
      ) : (
        tagihanFiltered.map((t) => {
          const j = jenis.find((x) => x.id === t.iuran_jenis_id)
          const p = paymentMap.get(t.id)
          const lunas = t.status === 'lunas'
          return (
            <div className="card" key={t.id}>
              <div className="card-title">
                <span className="mat-icon">home</span>
                <span style={{ fontWeight: 700 }}>{rumahLabel(t.rumah_id)}</span>
                <span className="badge badge-gray">{j?.nama ?? '—'}</span>
                <span style={{ marginLeft: 'auto' }} />
                <span className={`badge ${lunas ? 'badge-green' : 'badge-red'}`}>{lunas ? 'Lunas' : 'Belum'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>
                  {formatRp(t.nominal)}
                  {t.denda > 0 && <span style={{ color: 'var(--danger)', fontSize: '0.7rem' }}> + denda {formatRp(t.denda)}</span>}
                </div>
                {lunas ? (
                  <>
                    {p && (
                      <span className="badge badge-blue">
                        {formatTanggal(p.tgl)} · {p.metode}
                      </span>
                    )}
                    <button className="btn btn-sm btn-outline" onClick={() => setConfirm({ aksi: 'batalkan', tagihan: t })}>
                      Batalkan
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-sm btn-outline" onClick={() => setConfirm({ aksi: 'hapus', tagihan: t })}>
                      Hapus
                    </button>
                    <button className="btn btn-sm btn-success" onClick={() => openBayar(t)}>
                      Bayar
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* modal jenis iuran */}
      <Modal
        open={jOpen}
        onClose={() => setJOpen(false)}
        title={jEdit ? 'Edit Jenis Iuran' : 'Tambah Jenis Iuran'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setJOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={saveJenis} disabled={jBusy}>
              {jBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nama*</label>
          <input className="form-control" placeholder="contoh: Iuran Sampah" value={jForm.nama} onChange={(e) => setJForm({ ...jForm, nama: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Nominal per Bulan (Rp)*</label>
          <input className="form-control" inputMode="numeric" placeholder="contoh: 20000" value={jForm.nominal} onChange={(e) => setJForm({ ...jForm, nominal: e.target.value })} />
        </div>
        {jEdit && (
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600 }}>
              <input type="checkbox" checked={jForm.aktif} onChange={(e) => setJForm({ ...jForm, aktif: e.target.checked })} />
              Aktif (ikut di-generate)
            </label>
          </div>
        )}
      </Modal>

      {/* konfirmasi generate */}
      <ConfirmDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="Generate Tagihan"
        danger={false}
        confirmLabel="Generate"
        loading={genBusy}
        message={`Buat ${previewCount} tagihan ${NAMA_BULAN[bulan - 1]} ${tahun}? (${aktifJenis.map((j) => j.nama).join(', ')} × ${targetRumah.length} rumah dihuni/kontrakan). Tagihan yang sudah ada tidak didobel.`}
        onConfirm={doGenerate}
      />

      {/* modal bayar */}
      <Modal
        open={!!bayar}
        onClose={() => setBayar(null)}
        title={`Bayar ${bayar ? rumahLabel(bayar.rumah_id) : ''}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setBayar(null)}>
              Batal
            </button>
            <button className="btn btn-success" onClick={saveBayar} disabled={bBusy}>
              {bBusy ? '⏳' : 'Simpan Bayar'}
            </button>
          </>
        }
      >
        {bayar && (
          <>
            <div className="form-group">
              <label className="form-label">Nominal (Rp)*</label>
              <input className="form-control" inputMode="numeric" value={bForm.nominal} onChange={(e) => setBForm({ ...bForm, nominal: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-control" type="date" value={bForm.tgl} onChange={(e) => setBForm({ ...bForm, tgl: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Metode</label>
              <select className="form-control" value={bForm.metode} onChange={(e) => setBForm({ ...bForm, metode: e.target.value })}>
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catatan (opsional)</label>
              <input className="form-control" value={bForm.catatan} onChange={(e) => setBForm({ ...bForm, catatan: e.target.value })} />
            </div>
          </>
        )}
      </Modal>

      {/* konfirmasi hapus / batalkan */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.aksi === 'batalkan' ? 'Batalkan Pembayaran?' : 'Hapus?'}
        loading={delBusy}
        message={
          confirm?.aksi === 'batalkan'
            ? `Batalkan pembayaran ${confirm.tagihan ? rumahLabel(confirm.tagihan.rumah_id) : ''}? Tagihan kembali "Belum" dan catatan kas dihapus.`
            : confirm?.aksi === 'hapusJenis'
              ? `Hapus jenis iuran "${confirm.jenis?.nama}"?`
              : `Hapus tagihan ${confirm?.tagihan ? rumahLabel(confirm.tagihan.rumah_id) : ''} ${NAMA_BULAN[bulan - 1]} ${tahun}?`
        }
        onConfirm={doConfirm}
      />
    </div>
  )
}