import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'
import type { Profile, Role } from '../lib/types'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  ketua: 'Ketua',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  warga: 'Warga',
  satpam: 'Satpam',
}
const ROLE_EDITABLE: Role[] = ['warga', 'sekretaris', 'bendahara', 'ketua', 'satpam']

export default function PengaturanPage() {
  const { profile, perumahan, refreshProfile } = useAuth()
  const pid = profile?.perumahan_id

  const [nama, setNama] = useState('')
  const [alamat, setAlamat] = useState('')
  const [warna, setWarna] = useState('')
  const [logo, setLogo] = useState('')
  const [savBusy, setSavBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const WARNA_PRESET = ['#034BB9', '#0B7A3E', '#B4340F', '#7A0BB6', '#B60B6E', '#0F8BB4', '#B78A0B', '#333333']

  const [akun, setAkun] = useState<Profile[]>([])
  const [ready, setReady] = useState(false)
  const [roleBusy, setRoleBusy] = useState<string | null>(null)
  const [akifBusy, setAkifBusy] = useState<string | null>(null)
  const [bkpBusy, setBkpBusy] = useState(false)

  useEffect(() => {
    if (perumahan) {
      setNama(perumahan.nama)
      setAlamat(perumahan.alamat ?? '')
      setWarna(perumahan.warna ?? '')
      setLogo(perumahan.logo_url ?? '')
    }
  }, [perumahan])

  const loadAkun = async () => {
    if (!pid) return
    const { data } = await supabase.from('profiles').select('*').eq('perumahan_id', pid).order('nama')
    setAkun((data ?? []) as Profile[])
  }

  useEffect(() => {
    let alive = true
    async function init() {
      await loadAkun()
      if (alive) setReady(true)
    }
    if (pid) init()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid])

  const saveInfo = async () => {
    if (!pid) return
    if (!nama.trim()) {
      showToast('Nama perumahan wajib diisi', 'warning')
      return
    }
    setSavBusy(true)
    try {
      const { error } = await supabase
        .from('perumahan')
        .update({ nama: nama.trim(), alamat: alamat.trim(), warna: warna || null, logo_url: logo.trim() || null })
        .eq('id', pid)
      if (error) throw error
      await refreshProfile()
      showToast('Info perumahan disimpan 🎨', 'success')
    } catch {
      showToast('Gagal menyimpan (izin terbatas untuk pengelola)', 'danger')
    } finally {
      setSavBusy(false)
    }
  }

  const copyKode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(perumahan?.kode_undangan ?? '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const ubahPeran = async (t: Profile, r: string) => {
    const role = r as Role
    if (role === t.role) return
    setRoleBusy(t.id)
    try {
      const { data, error } = await supabase.rpc('ubah_peran_warga', { v_target: t.id, v_peran: role })
      if (error) throw error
      const res = data as { ok?: boolean; error?: string } | null
      if (res && res.ok === false) throw new Error(res.error || 'Gagal')
      showToast(`Peran ${t.nama} → ${ROLE_LABEL[role]}`, 'success')
      await loadAkun()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal ubah peran', 'danger')
    } finally {
      setRoleBusy(null)
    }
  }

  const toggleAktif = async (t: Profile) => {
    setAkifBusy(t.id)
    try {
      const { data, error } = await supabase.rpc('setujui_warga', { v_target: t.id, v_aktif: !t.aktif, v_rumah_id: t.rumah_id })
      if (error) throw error
      const res = data as { ok?: boolean; error?: string } | null
      if (res && res.ok === false) throw new Error(res.error || 'Gagal')
      showToast(t.aktif ? `${t.nama} dinonaktifkan` : `${t.nama} diaktifkan`, 'success')
      await loadAkun()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'danger')
    } finally {
      setAkifBusy(null)
    }
  }

  const cashback = async () => {
    if (!pid) return
    setBkpBusy(true)
    try {
      const { data, error } = await supabase.rpc('backup_perumahan')
      if (error) throw error
      const res = data as { ok?: boolean; error?: string } | null
      if (res && res.ok === false) throw new Error(res.error || 'Gagal membuat cadangan')
      if (!res || typeof res !== 'object') throw new Error('Data cadangan kosong')
      const payload = JSON.stringify(res, null, 2)
      const blob = new Blob([payload], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)
      a.href = url
      a.download = `cadangan-rumahkita-${ts}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast(`Cadangan diunduh (${(payload.length / 1024).toFixed(1)} KB)`, 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat cadangan', 'danger')
    } finally {
      setBkpBusy(false)
    }
  }

  const akunSorted = [...akun].sort((a, b) => {
    const order = (r: string) => (r === 'super_admin' ? 0 : r === 'ketua' ? 1 : 2)
    return order(a.role) - order(b.role) || a.nama.localeCompare(b.nama)
  })

  return (
    <div className="tab-page">
      <h2 className="page-title" style={{ marginBottom: 14 }}>
        ⚙️ Pengaturan
      </h2>

      <div className="card">
        <div className="card-title">
          <span className="mat-icon">home</span>
          <span style={{ fontWeight: 700 }}>Info Perumahan</span>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Perumahan</label>
          <input className="form-control" value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Alamat</label>
          <input className="form-control" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="form-label">Warna Tema</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {WARNA_PRESET.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setWarna(c)}
                style={{
                  width: 34, height: 34, borderRadius: 10, padding: 0, cursor: 'pointer',
                  border: warna === c ? '3px solid var(--text)' : '2px solid var(--border)', background: c,
                }}
                aria-label={`Warna ${c}`}
              />
            ))}
            <label
              style={{
                position: 'relative', width: 34, height: 34, borderRadius: 10, overflow: 'hidden',
                cursor: 'pointer', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 15 }}>🎨</span>
              <input
                type="color"
                value={warna || '#034BB9'}
                onChange={(e) => setWarna(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="form-label">Logo (opsional) — tempel link gambar</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-control"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://…/logo.png"
            />
            {logo && (
              <img
                src={logo}
                alt=""
                style={{ height: 34, width: 34, objectFit: 'contain', borderRadius: 8, background: 'var(--surface-variant)', flexShrink: 0 }}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.25')}
              />
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
          <label className="form-label" style={{ margin: 0 }}>
            Kode Undangan
          </label>
          <code
            style={{ background: 'var(--surface-variant)', padding: '4px 10px', borderRadius: 8, fontWeight: 700, letterSpacing: 1 }}
          >
            {perumahan?.kode_undangan ?? ''}
          </code>
          <button className="btn btn-sm btn-outline" onClick={copyKode}>
            {copied ? '✓ Disalin' : 'Salin'}
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Kode ini dipakai warga saat mendaftar. Bagikan hanya ke warga perumahan.
        </p>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={saveInfo} disabled={savBusy}>
            {savBusy ? '⏳' : 'Simpan Info'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">
          <span className="mat-icon">admin_panel_settings</span>
          <span style={{ fontWeight: 700 }}>Akun & Peran</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
          Atur peran akun anggota (misal jadikan bendahara/sekretaris). Akun sendiri &amp; Super Admin terkunci agar aman.
        </p>
        {!ready ? (
          <div className="loading-screen" style={{ minHeight: '20dvh' }}>
            <div className="spinner" />
          </div>
        ) : akunSorted.length === 0 ? (
          <div className="empty-state">
            <span className="mat-icon">person</span>
            <p>Belum ada akun.</p>
          </div>
        ) : (
          akunSorted.map((a) => {
            const isSelf = a.id === profile?.id
            const lock = isSelf || a.role === 'super_admin'
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{a.nama}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {a.no_hp || '—'} · <span className={`badge ${a.aktif ? 'badge-green' : 'badge-gray'}`}>{a.aktif ? 'Aktif' : 'Nonaktif'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {lock ? (
                    <span className="badge badge-blue">{ROLE_LABEL[a.role]}</span>
                  ) : (
                    <select
                      className="form-control"
                      style={{ minWidth: 130, padding: '4px 6px' }}
                      value={a.role}
                      disabled={roleBusy === a.id}
                      onChange={(e) => ubahPeran(a, e.target.value)}
                    >
                      {ROLE_EDITABLE.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  )}
                  {!lock && (
                    <button className="btn btn-sm btn-outline" disabled={akifBusy === a.id} onClick={() => toggleAktif(a)}>
                      {a.aktif ? 'Nonaktif' : 'Aktif'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">
          <span className="mat-icon">backup</span>
          <span style={{ fontWeight: 700 }}>Cadangkan Data</span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Unduh seluruh data perumahan (warga, rumah, iuran, kas, aset, dokumen) sebagai satu file JSON.
          Simpan file ini di tempat aman sebagai cadangan berkala.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={cashback} disabled={bkpBusy}>
            {bkpBusy ? '⏳ Membuat…' : '⬇️ Unduh Cadangan (JSON)'}
          </button>
        </div>
      </div>
    </div>
  )
}