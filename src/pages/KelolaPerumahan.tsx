import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'
import { QrisAdminCard } from '../components/QrisPanel'
import PaketAdminCard from '../components/PaketPanel'
import type { Perumahan, Profile, Role } from '../lib/types'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  ketua: 'Ketua',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  warga: 'Warga',
  satpam: 'Satpam',
}
const ROLE_EDITABLE: Role[] = ['warga', 'sekretaris', 'bendahara', 'ketua', 'satpam']

export default function KelolaPerumahanPage() {
  const { profile } = useAuth()
  const [perumahan, setPerumahan] = useState<Perumahan[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [rumahCount, setRumahCount] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [lgBusy, setLgBusy] = useState<string | null>(null)

  const [fNama, setFNama] = useState('')
  const [fAlamat, setFAlamat] = useState('')
  const [fKode, setFKode] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const load = async () => {
    const [p, pr, r] = await Promise.all([
      supabase.from('perumahan').select('*').order('created_at', { ascending: true }),
      supabase.from('profiles').select('*').order('nama'),
      supabase.from('rumah').select('perumahan_id'),
    ])
    setPerumahan((p.data ?? []) as Perumahan[])
    setProfiles((pr.data ?? []) as Profile[])
    const rc: Record<string, number> = {}
    for (const row of r.data ?? []) rc[row.perumahan_id] = (rc[row.perumahan_id] ?? 0) + 1
    setRumahCount(rc)
  }

  useEffect(() => {
    let alive = true
    async function init() {
      await load()
      if (alive) setReady(true)
    }
    init()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const byPid = useMemo(() => {
    const m: Record<string, Profile[]> = {}
    for (const pr of profiles) (m[pr.perumahan_id] ??= []).push(pr)
    for (const k of Object.keys(m)) m[k].sort((a, b) => (a.role === 'super_admin' ? 0 : a.role === 'ketua' ? 1 : 2) - (b.role === 'super_admin' ? 0 : b.role === 'ketua' ? 1 : 2) || a.nama.localeCompare(b.nama))
    return m
  }, [profiles])

  if (profile?.role !== 'super_admin') {
    return (
      <div className="tab-page">
        <div className="card">
          <div className="empty-state">
            <span className="mat-icon">lock</span>
            <p>Halaman khusus Super Admin.</p>
          </div>
        </div>
      </div>
    )
  }

  const atur = async (t: Profile, opts: { v_peran?: string; v_aktif?: boolean }) => {
    setBusy(t.id)
    try {
      const { data, error } = await supabase.rpc('admin_atur_akun', {
        v_target: t.id,
        v_peran: opts.v_peran ?? null,
        v_aktif: opts.v_aktif ?? null,
      })
      if (error) throw error
      const res = data as { ok?: boolean; error?: string } | null
      if (res && res.ok === false) throw new Error(res.error || 'Gagal')
      showToast('Disimpan', 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'danger')
    } finally {
      setBusy(null)
    }
  }

  const addMonths = (d: Date, n: number) => {
    const x = new Date(d)
    x.setMonth(x.getMonth() + n)
    return x
  }

  const setLangganan = async (ph: Perumahan, mode: '1b' | '3b' | '1t' | 'forever' | 'stop') => {
    setLgBusy(ph.id)
    try {
      const now = new Date()
      const cur = ph.langganan_hingga ? new Date(ph.langganan_hingga + 'T23:59:59') : null
      const base = cur && cur > now ? cur : now
      let value: string | null
      if (mode === '1b') value = addMonths(base, 1).toISOString().slice(0, 10)
      else if (mode === '3b') value = addMonths(base, 3).toISOString().slice(0, 10)
      else if (mode === '1t') {
        const x = new Date(base)
        x.setFullYear(x.getFullYear() + 1)
        value = x.toISOString().slice(0, 10)
      } else if (mode === 'forever') value = null
      else value = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      const { error } = await supabase.from('perumahan').update({ langganan_hingga: value }).eq('id', ph.id)
      if (error) throw error
      showToast('Status langganan diperbarui', 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memperbarui langganan', 'danger')
    } finally {
      setLgBusy(null)
    }
  }

  const tambahPerumahan = async () => {
    const kode = fKode.trim().toUpperCase().replace(/\s+/g, '')
    if (!fNama.trim() || !kode) {
      showToast('Nama & kode undangan wajib diisi', 'warning')
      return
    }
    setAddBusy(true)
    try {
      const { error } = await supabase.from('perumahan').insert({ nama: fNama.trim(), alamat: fAlamat.trim(), kode_undangan: kode })
      if (error) {
        if (/duplicate|unique/i.test(error.message)) throw new Error('Kode undangan sudah dipakai perumahan lain')
        throw error
      }
      showToast(`Perumahan "${fNama.trim()}" dibuat`, 'success')
      setFNama('')
      setFAlamat('')
      setFKode('')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat perumahan', 'danger')
    } finally {
      setAddBusy(false)
    }
  }

  return (
    <div className="tab-page">
      <h2 className="page-title" style={{ marginBottom: 14 }}>
        🏘️ Kelola Perumahan
      </h2>

      {/* tambah perumahan */}
      <div className="card">
        <div className="card-title">
          <span className="mat-icon">add_home</span>
          <span style={{ fontWeight: 700 }}>Tambah Perumahan Baru</span>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Perumahan</label>
          <input className="form-control" value={fNama} onChange={(e) => setFNama(e.target.value)} placeholder="mis. Griya Asri" />
        </div>
        <div className="form-group">
          <label className="form-label">Alamat</label>
          <input className="form-control" value={fAlamat} onChange={(e) => setFAlamat(e.target.value)} placeholder="mis. Jl. Melati No. 1" />
        </div>
        <div className="form-group">
          <label className="form-label">Kode Undangan (huruf besar, tanpa spasi, unik)</label>
          <input className="form-control" value={fKode} onChange={(e) => setFKode(e.target.value)} placeholder="mis. GRIYA" style={{ textTransform: 'uppercase' }} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={tambahPerumahan} disabled={addBusy}>
            {addBusy ? '⏳' : '➕ Buat Perumahan'}
          </button>
        </div>
      </div>

      <QrisAdminCard />
      <PaketAdminCard />

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : perumahan.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="mat-icon">apartment</span>
            <p>Belum ada perumahan.</p>
          </div>
        </div>
      ) : (
        perumahan.map((ph) => {
          const list = byPid[ph.id] ?? []
          const aktifCount = list.filter((a) => a.aktif).length
          return (
            <div className="card" key={ph.id} style={{ marginTop: 12 }}>
              <div className="card-title">
                <span className="mat-icon">apartment</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{ph.nama}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {ph.alamat || '—'} · kode <code style={{ fontWeight: 700 }}>{ph.kode_undangan}</code>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    👥 {list.length} akun · 🏠 {rumahCount[ph.id] ?? 0} rumah · ✅ {aktifCount} aktif
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Langganan:</span>
                <span className={`badge ${ph.langganan_hingga && new Date(ph.langganan_hingga + 'T23:59:59') < new Date() ? 'badge-amber' : 'badge-green'}`}>
                  {ph.langganan_hingga
                    ? `sampai ${new Date(ph.langganan_hingga).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : 'tanpa batas'}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm" disabled={lgBusy === ph.id} onClick={() => setLangganan(ph, '1b')}>
                    +1 bln
                  </button>
                  <button className="btn btn-sm" disabled={lgBusy === ph.id} onClick={() => setLangganan(ph, '3b')}>
                    +3 bln
                  </button>
                  <button className="btn btn-sm" disabled={lgBusy === ph.id} onClick={() => setLangganan(ph, '1t')}>
                    +1 thn
                  </button>
                  <button className="btn btn-sm btn-outline" disabled={lgBusy === ph.id} onClick={() => setLangganan(ph, 'forever')}>
                    Tanpa Batas
                  </button>
                  <button className="btn btn-sm btn-danger" disabled={lgBusy === ph.id} onClick={() => setLangganan(ph, 'stop')}>
                    Hentikan
                  </button>
                </div>
              </div>

              {list.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px 0' }}>
                  Belum ada akun. Ketua perumahan ini tinggal daftar di app pakai kode undangan di atas.
                </p>
              ) : (
                list.map((a) => {
                  const lock = a.id === profile?.id || a.role === 'super_admin'
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>
                          {a.nama}{' '}
                          {!a.aktif && <span className="badge badge-amber">Belum aktif</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.no_hp || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {lock ? (
                          <span className="badge badge-blue">{ROLE_LABEL[a.role]}</span>
                        ) : (
                          <select
                            className="form-control"
                            style={{ minWidth: 120, padding: '4px 6px' }}
                            value={a.role}
                            disabled={busy === a.id}
                            onChange={(e) => atur(a, { v_peran: e.target.value })}
                          >
                            {ROLE_EDITABLE.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                        )}
                        {!lock && (
                          <button className="btn btn-sm btn-outline" disabled={busy === a.id} onClick={() => atur(a, { v_aktif: !a.aktif })}>
                            {a.aktif ? 'Nonaktif' : 'Aktif'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )
        })
      )}
    </div>
  )
}