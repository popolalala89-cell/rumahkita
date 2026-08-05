import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Pengumuman } from '../lib/types'
import { formatRp } from '../lib/format'

interface Stats {
  rumah: number
  warga: number
  tagihanBelum: number
  kasBulanIni: number
}

export default function Dashboard() {
  const { profile, perumahan, hasRole } = useAuth()
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([])
  const [stats, setStats] = useState<Stats>({ rumah: 0, warga: 0, tagihanBelum: 0, kasBulanIni: 0 })
  const [ready, setReady] = useState(false)

  const isPengurus = hasRole('ketua', 'bendahara', 'sekretaris')

  useEffect(() => {
    let alive = true
    if (!profile) return

    const pid = profile.perumahan_id
    const now = new Date()
    const bulan = now.getMonth() + 1
    const tahun = now.getFullYear()

    async function load() {
      try {
        const [p, r, w, t, k] = await Promise.all([
          supabase.from('pengumuman').select('*').eq('perumahan_id', pid).order('tgl', { ascending: false }).limit(3),
          supabase.from('rumah').select('id', { count: 'exact' }).eq('perumahan_id', pid),
          supabase.from('warga').select('id', { count: 'exact' }).eq('perumahan_id', pid).eq('aktif', true),
          supabase
            .from('tagihan')
            .select('id', { count: 'exact' })
            .eq('perumahan_id', pid)
            .eq('bulan', bulan)
            .eq('tahun', tahun)
            .eq('status', 'belum'),
          supabase
            .from('kas_transaksi')
            .select('nominal')
            .eq('perumahan_id', pid)
            .gte('tgl', `${tahun}-${String(bulan).padStart(2, '0')}-01`)
            .lt('tgl', `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`)
            .eq('jenis', 'masuk'),
        ])
        if (!alive) return
        setPengumuman((p.data ?? []) as Pengumuman[])
        setStats({
          rumah: r.count ?? 0,
          warga: w.count ?? 0,
          tagihanBelum: t.count ?? 0,
          kasBulanIni: (k.data ?? []).reduce((s, x) => s + (x as { nominal: number }).nominal, 0),
        })
      } catch {
        // tabel belum dibuat (setup belum selesai) — tampilkan kosong
      } finally {
        if (alive) setReady(true)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [profile])

  const nama = profile?.nama ?? ''
  const jam = new Date().getHours()
  const sapaan = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 19 ? 'Selamat sore' : 'Selamat malam'

  return (
    <div className="tab-page">
      <div className="hero-card">
        <div className="hero-greet">{sapaan},</div>
        <div className="hero-name">{nama}</div>
        <div className="hero-sub">
          <span className="mat-icon" style={{ fontSize: 16 }}>location_on</span>
          {perumahan?.nama ?? '—'}
          {isPengurus && stats.tagihanBelum > 0 && (
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 999 }} className="badge">
              {stats.tagihanBelum} tagihan belum bayar
            </span>
          )}
        </div>
      </div>

      {!ready ? (
        <div className="loading-screen" style={{ minHeight: '30dvh' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {isPengurus && (
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-icon mat-icon">home</span>
                <div className="stat-label">Rumah</div>
                <div className="stat-value">{stats.rumah}</div>
              </div>
              <div className="stat-card">
                <span className="stat-icon mat-icon">groups</span>
                <div className="stat-label">Warga Aktif</div>
                <div className="stat-value">{stats.warga}</div>
              </div>
              <div className="stat-card">
                <span className="stat-icon mat-icon">receipt_long</span>
                <div className="stat-label">Tagihan Bulan Ini</div>
                <div className="stat-value">{stats.tagihanBelum}</div>
              </div>
              <div className="stat-card">
                <span className="stat-icon mat-icon">savings</span>
                <div className="stat-label">Kas Masuk Bulan Ini</div>
                <div className="stat-value">{formatRp(stats.kasBulanIni)}</div>
              </div>
            </div>
          )}

          <div className="section-title">
            <span>📢 Pengumuman Terbaru</span>
          </div>
          {pengumuman.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 16 }}>
                <p>Belum ada pengumuman.</p>
              </div>
            </div>
          ) : (
            pengumuman.map((p) => (
              <div className="card" key={p.id}>
                <div className="card-title">
                  {p.penting ? <span className="badge badge-red">Penting</span> : <span className="badge badge-blue">Info</span>}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.judul}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                  {(p.isi || '').slice(0, 140)}
                  {(p.isi || '').length > 140 ? '…' : ''}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  {new Date(p.tgl || p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
