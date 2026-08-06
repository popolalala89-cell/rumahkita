import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'
import BuktiImage from '../components/ui/BuktiImage'
import type { PermintaanLanggananRow } from '../lib/types'

type Tab = 'semua' | 'menunggu' | 'diterima' | 'ditolak'
const TABS: { id: Tab; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'menunggu', label: 'Menunggu' },
  { id: 'diterima', label: 'Diterima' },
  { id: 'ditolak', label: 'Ditolak' },
]

export default function PermintaanPage() {
  const [tab, setTab] = useState<Tab>('menunggu')
  const [list, setList] = useState<PermintaanLanggananRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('permintaan_langganan')
      .select('*, perumahan(nama, kode_undangan), profiles(nama)')
      .order('dibuat_pada', { ascending: false })
    if (data) setList(data as PermintaanLanggananRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const tinjau = async (r: PermintaanLanggananRow, status: 'diterima' | 'ditolak') => {
    setBusy(r.id)
    const { error } = await supabase
      .from('permintaan_langganan')
      .update({ status, ditinjau_pada: new Date().toISOString() })
      .eq('id', r.id)
    setBusy(null)
    if (error) {
      showToast('Gagal memperbarui', 'danger')
      return
    }
    showToast(status === 'diterima' ? 'Permintaan diterima ✅' : 'Permintaan ditolak', 'success')
    load()
  }

  const shown = tab === 'semua' ? list : list.filter((r) => r.status === tab)
  const count = (t: Tab) => (t === 'semua' ? list.length : list.filter((r) => r.status === t).length)

  return (
    <div>
      <div className="tab-content">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab(t.id)}
            >
              {t.label} ({count(t.id)})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-card">
            <p className="li-sub">Memuat…</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="page-card">
            <p className="li-sub">Tidak ada permintaan di tab ini.</p>
          </div>
        ) : (
          shown.map((r) => (
            <div className="page-card" key={r.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={`badge ${r.status === 'menunggu' ? 'badge-blue' : r.status === 'diterima' ? 'badge-green' : 'badge-red'}`}>
                  {r.status === 'menunggu' ? 'Menunggu' : r.status === 'diterima' ? 'Diterima' : 'Ditolak'}
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  {r.perumahan?.nama || '(perumahan)'}
                  {r.perumahan?.kode_undangan ? ` · ${r.perumahan.kode_undangan}` : ''}
                </span>
              </div>
              <p className="li-sub" style={{ marginTop: 6 }}>
                Oleh: {r.profiles?.nama || r.pemohon_id.slice(0, 8)} ·{' '}
                {new Date(r.dibuat_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              {r.catatan && (
                <p className="li-sub" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                  {r.catatan}
                </p>
              )}
              <div style={{ marginTop: 10 }}>
                <BuktiImage path={r.bukti_url} />
              </div>
              {r.status === 'menunggu' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-sm btn-success" style={{ flex: 1 }} disabled={busy === r.id} onClick={() => tinjau(r, 'diterima')}>
                    ✓ Terima
                  </button>
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }} disabled={busy === r.id} onClick={() => tinjau(r, 'ditolak')}>
                    ✕ Tolak
                  </button>
                </div>
              )}
              <p className="li-sub" style={{ marginTop: 8 }}>
                {r.status === 'diterima' || r.status === 'ditolak' ? `Ditinjau ${r.ditinjau_pada ? new Date(r.ditinjau_pada).toLocaleString('id-ID') : ''}` : 'Setelah diterima, atur durasi di menu Kelola Perumahan.'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}