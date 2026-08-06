import { useState } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'

type Step = 'akun' | 'perumahan' | 'konfirmasi'

export default function MulaiPage() {
  const navigate = useNavigate()
  const { user, profile, loading, logout } = useAuth()

  const [step, setStep] = useState<Step>('akun')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const [pNama, setPNama] = useState('')
  const [pAlamat, setPAlamat] = useState('')
  const [pKode, setPKode] = useState('')
  const [pBusy, setPBusy] = useState(false)

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div>Memuat...</div>
      </div>
    )
  }

  // sudah punya akun aktif → langsung ke dasbor
    if (user && profile) {
      return <Navigate to="/app" replace />
    }

    // sudah login tapi belum ada perumahan → langkah buat perumahan
    const effective = user && !profile ? 'perumahan' : step

  const buatAkun = async () => {
    if (!email.trim() || !password) {
      showToast('Email & password wajib diisi', 'warning')
      return
    }
    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'warning')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) throw new Error(error.message)
      if (!data.user) throw new Error('Pendaftaran gagal, coba lagi')
      if (!data.session) {
        setStep('konfirmasi')
        showToast('Akun dibuat. Cek email untuk verifikasi.', 'success')
      }
      // kalau langsung dapat sesi, useAuth otomatis pindah ke langkah perumah
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat akun', 'danger')
    } finally {
      setBusy(false)
    }
  }

  const buatPerumahan = async () => {
    const kode = pKode.trim().toUpperCase().replace(/\s+/g, '')
    if (!pNama.trim() || !kode) {
      showToast('Nama perumahan & kode undangan wajib diisi', 'warning')
      return
    }
    setPBusy(true)
    try {
      const { data, error } = await supabase.rpc('create_perumahan_owner', {
        p_nama: pNama.trim(),
        p_alamat: pAlamat.trim(),
        p_kode: kode,
      })
      if (error) throw new Error(error.message)
      const res = data as { ok?: boolean; error?: string } | null
      if (res && res.ok === false) throw new Error(res.error || 'Gagal membuat perumahan')
      showToast('Perumahan dibuat! Selamat datang 🎉', 'success')
      navigate('/app')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal membuat perumahan', 'danger')
    } finally {
      setPBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', margin: '10px 0 18px' }}>
          <div style={{ fontSize: 40 }}>🏘️</div>
          <h2 style={{ margin: 0 }}>Mulai Pakai RumahKita</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Buat perumahanmu sendiri dan kelola warga, iuran & kas tanpa ribet.
          </p>
        </div>

        {effective === 'akun' && (
          <>
            <div className="form-group">
              <label className="form-label">Email Pengelola</label>
              <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="btn btn-outline" to="/masuk" style={{ textDecoration: 'none', textAlign: 'center' }}>
                Masuk
              </Link>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={buatAkun} disabled={busy}>
                {busy ? '⏳' : 'Lanjut Buat Perumahan'}
              </button>
            </div>
          </>
        )}

        {effective === 'perumahan' && (
          <>
            <div className="form-group">
              <label className="form-label">Nama Perumahan</label>
              <input className="form-control" value={pNama} onChange={(e) => setPNama(e.target.value)} placeholder="mis. Griya Asri Residence" />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <input className="form-control" value={pAlamat} onChange={(e) => setPAlamat(e.target.value)} placeholder="mis. Jl. Melati No. 1" />
            </div>
            <div className="form-group">
              <label className="form-label">Kode Undangan (huruf besar, tanpa spasi)</label>
              <input className="form-control" value={pKode} onChange={(e) => setPKode(e.target.value)} placeholder="mis. GRIYA" style={{ textTransform: 'uppercase' }} />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Kode ini dipakai warga saat mendaftar. Simpan baik-baik.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => logout()} disabled={pBusy}>
                Keluar
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={buatPerumahan} disabled={pBusy}>
                {pBusy ? '⏳' : '🚀 Aktifkan Perumahanku'}
              </button>
            </div>
          </>
        )}

        {effective === 'konfirmasi' && (
          <div style={{ textAlign: 'center' }}>
            <p>
              Cek email <b>{email}</b> untuk link verifikasi. Setelah diverifikasi, masuk lagi dan lanjut buat perumahan.
            </p>
            <Link className="btn btn-primary" to="/masuk" style={{ textDecoration: 'none', marginTop: 10 }}>
              Ke Halaman Masuk
            </Link>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Sudah punya perumahan? <Link to="/daftar">Daftar sebagai warga</Link>
        </div>
      </div>
    </div>
  )
}