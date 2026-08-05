import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../lib/toast'
import { formatRp, formatTanggal } from '../lib/format'
import { downloadExcel } from '../lib/exportExcel'
import { insertKas, hasSumberColumn } from '../lib/kas'
import type { KasTransaksi } from '../lib/types'

type Filter = 'semua' | 'masuk' | 'keluar'
const KATEGORI_MASUK = ['Iuran', 'Sumbangan', 'Donasi', 'Lainnya']
const KATEGORI_KELUAR = ['Operasional', 'Perbaikan', 'Kegiatan', 'Lainnya']

export default function KasPage() {
  const { profile, user } = useAuth()
  const pid = profile?.perumahan_id

  const [transaksi, setTransaksi] = useState<KasTransaksi[]>([])
  const [filter, setFilter] = useState<Filter>('semua')
  const [ready, setReady] = useState(false)
  const [hasSumber, setHasSumber] = useState(true)

  // modal transaksi
  const [tModal, setTModal] = useState<null | 'masuk' | 'keluar'>(null)
  const [tForm, setTForm] = useState({ tgl: '', kategori: '', nominal: '', keterangan: '' })
  const [tBusy, setTBusy] = useState(false)

  // konfirmasi hapus
  const [confirm, setConfirm] = useState<KasTransaksi | null>(null)
  const [delBusy, setDelBusy] = useState(false)

  const reload = useMemo(() => {
    if (!pid) return
    return async () => {
      const { data } = await supabase.from('kas_transaksi').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }).order('created_at', { ascending: false }).limit(1000)
      setTransaksi((data ?? []) as KasTransaksi[])
    }
  }, [pid]) as (() => void) | undefined

  useEffect(() => {
    let alive = true
    async function init() {
      try {
        const [src] = await Promise.all([hasSumberColumn()])
        if (!alive) return
        setHasSumber(src)
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

  const now = new Date()
  const bulanIni = now.getMonth() + 1
  const tahunIni = now.getFullYear()

  const stats = useMemo(() => {
    let masuk = 0
    let keluar = 0
    let masukBulan = 0
    let keluarBulan = 0
    for (const t of transaksi) {
      if (t.jenis === 'masuk') {
        masuk += t.nominal
        const d = new Date(t.tgl)
        if (d.getMonth() + 1 === bulanIni && d.getFullYear() === tahunIni) masukBulan += t.nominal
      } else {
        keluar += t.nominal
        const d = new Date(t.tgl)
        if (d.getMonth() + 1 === bulanIni && d.getFullYear() === tahunIni) keluarBulan += t.nominal
      }
    }
    return { masuk, keluar, saldo: masuk - keluar, masukBulan, keluarBulan }
  }, [transaksi, bulanIni, tahunIni])

  const filtered = useMemo(() => {
    if (filter === 'semua') return transaksi
    return transaksi.filter((t) => t.jenis === filter)
  }, [transaksi, filter])

  const dariPembayaran = (t: KasTransaksi): boolean => !!t.sumber?.startsWith('pembayaran:')

  const openModal = (jenis: 'masuk' | 'keluar') => {
    setTModal(jenis)
    setTForm({
      tgl: new Date().toISOString().slice(0, 10),
      kategori: jenis === 'masuk' ? KATEGORI_MASUK[0] : KATEGORI_KELUAR[0],
      nominal: '',
      keterangan: '',
    })
  }

  const saveTransaksi = async () => {
    if (!pid || !tModal) return
    const nominal = parseInt(tForm.nominal)
    if (isNaN(nominal) || nominal <= 0) {
      showToast('Nominal tidak valid', 'warning')
      return
    }
    setTBusy(true)
    try {
      const err = await insertKas({
        perumahan_id: pid,
        tgl: tForm.tgl,
        jenis: tModal,
        kategori: tForm.kategori,
        nominal,
        keterangan: tForm.keterangan,
        user_id: user?.id ?? null,
        sumber: 'manual',
      })
      if (err) throw err
      showToast(`Kas ${tModal === 'masuk' ? 'masuk' : 'keluar'} dicatat ✓`, 'success')
      setTModal(null)
      if (reload) await reload()
    } catch {
      showToast('Gagal menyimpan transaksi', 'danger')
    } finally {
      setTBusy(false)
    }
  }

  const doHapus = async () => {
    if (!confirm) return
    setDelBusy(true)
    try {
      if (dariPembayaran(confirm)) {
        showToast('Transaksi dari pembayaran — batalkan lewat halaman Iuran', 'warning')
        setConfirm(null)
        return
      }
      await supabase.from('kas_transaksi').delete().eq('id', confirm.id)
      showToast('Transaksi dihapus', 'success')
      setConfirm(null)
      if (reload) await reload()
    } catch {
      showToast('Gagal menghapus', 'danger')
    } finally {
      setDelBusy(false)
    }
  }

  const exportExcel = () => {
    if (transaksi.length === 0) {
      showToast('Belum ada transaksi untuk diekspor', 'warning')
      return
    }
    const rows = transaksi.map((t) => ({
      Tanggal: t.tgl,
      Jenis: t.jenis === 'masuk' ? 'Masuk' : 'Keluar',
      Kategori: t.kategori || '—',
      'Nominal (Rp)': t.nominal,
      Keterangan: t.keterangan || '',
      Sumber: dariPembayaran(t) ? 'Dari pembayaran iuran' : 'Manual',
    }))
    const ringkas = [
      { Item: 'Saldo Kas', Nilai: stats.saldo },
      { Item: 'Total Masuk', Nilai: stats.masuk },
      { Item: 'Total Keluar', Nilai: stats.keluar },
      { Item: 'Masuk Bulan Ini', Nilai: stats.masukBulan },
      { Item: 'Keluar Bulan Ini', Nilai: stats.keluarBulan },
    ]
    downloadExcel('Laporan Kas RumahKita.xlsx', [
      { name: 'Riwayat Kas', rows },
      { name: 'Ringkasan', rows: ringkas },
    ])
    showToast('File Excel diunduh', 'success')
  }

  return (
    <div className="tab-page">
      {!hasSumber && (
        <div
          style={{
            background: 'var(--warning)', color: '#fff', borderRadius: 12,
            padding: '10px 14px', marginBottom: 12, fontSize: '0.75rem', fontWeight: 600,
          }}
        >
          ℹ️ Jalankan supabase/fase1_alter.sql di SQL Editor supaya transaksi dari pembayaran iuran bisa dibedakan & dibatalkan otomatis.
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Saldo Kas</div>
          <div className="stat-value" style={{ color: stats.saldo < 0 ? 'var(--danger)' : 'var(--text)' }}>{formatRp(stats.saldo)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Masuk Bulan Ini</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{formatRp(stats.masukBulan)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Keluar Bulan Ini</div>
          <div className="stat-value" style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>{formatRp(stats.keluarBulan)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Masuk</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatRp(stats.masuk)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div className="row-actions" style={{ marginBottom: 0 }}>
          <button className="btn btn-outline" onClick={exportExcel}>
            <span className="mat-icon">file_download</span> Excel
          </button>
          <button className="btn btn-outline" onClick={() => openModal('keluar')} style={{ color: 'var(--danger)', borderColor: '#fecaca' }}>
            <span className="mat-icon">outbox</span> Kas Keluar
          </button>
          <button className="btn btn-success" onClick={() => openModal('masuk')}>
            <span className="mat-icon">inbox</span> Kas Masuk
          </button>
        </div>
      </div>

      <div className="chip-row">
        <button className={`chip${filter === 'semua' ? ' active' : ''}`} onClick={() => setFilter('semua')}>
          Semua
        </button>
        <button className={`chip${filter === 'masuk' ? ' active' : ''}`} onClick={() => setFilter('masuk')}>
          Masuk
        </button>
        <button className={`chip${filter === 'keluar' ? ' active' : ''}`} onClick={() => setFilter('keluar')}>
          Keluar
        </button>
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '20dvh' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="mat-icon">account_balance</span>
            <p>Belum ada transaksi kas.</p>
          </div>
        </div>
      ) : (
        filtered.map((t) => {
          const auto = dariPembayaran(t)
          return (
            <div className="card" key={t.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  className="li-icon"
                  style={{ background: t.jenis === 'masuk' ? '#dcfce7' : '#fee2e2', color: t.jenis === 'masuk' ? 'var(--success)' : 'var(--danger)' }}
                >
                  <span className="mat-icon">{t.jenis === 'masuk' ? 'south_west' : 'north_east'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.kategori || 'Kas'}
                    {auto && <span className="badge badge-blue">otomatis</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatTanggal(t.tgl)}
                    {t.keterangan ? ` · ${t.keterangan}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: t.jenis === 'masuk' ? 'var(--success)' : 'var(--danger)' }}>
                    {t.jenis === 'masuk' ? '+' : '−'}{formatRp(t.nominal)}
                  </div>
                  {!auto && (
                    <button className="btn btn-sm btn-danger" style={{ minHeight: 28, marginTop: 4 }} onClick={() => setConfirm(t)}>
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* modal transaksi */}
      <Modal
        open={!!tModal}
        onClose={() => setTModal(null)}
        title={tModal === 'masuk' ? 'Catat Kas Masuk' : 'Catat Kas Keluar'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setTModal(null)}>
              Batal
            </button>
            <button className={`btn ${tModal === 'masuk' ? 'btn-success' : 'btn-danger'}`} onClick={saveTransaksi} disabled={tBusy}>
              {tBusy ? '⏳' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-control" type="date" value={tForm.tgl} onChange={(e) => setTForm({ ...tForm, tgl: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select className="form-control" value={tForm.kategori} onChange={(e) => setTForm({ ...tForm, kategori: e.target.value })}>
            {(tModal === 'masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nominal (Rp)*</label>
          <input className="form-control" inputMode="numeric" placeholder="contoh: 50000" value={tForm.nominal} onChange={(e) => setTForm({ ...tForm, nominal: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Keterangan (opsional)</label>
          <input className="form-control" placeholder="contoh: beli lampu taman" value={tForm.keterangan} onChange={(e) => setTForm({ ...tForm, keterangan: e.target.value })} />
        </div>
      </Modal>

      {/* konfirmasi hapus */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Hapus Transaksi?"
        message={`Hapus transaksi ${confirm?.kategori || 'kas'} ${formatRp(confirm?.nominal ?? 0)}?`}
        loading={delBusy}
        onConfirm={doHapus}
      />
    </div>
  )
}