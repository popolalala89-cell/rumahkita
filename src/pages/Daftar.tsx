import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { showToast } from '../lib/toast'

export default function Daftar() {
  const { daftar } = useAuth()
  const navigate = useNavigate()
  const [nama, setNama] = useState('')
  const [noHp, setNoHp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kode, setKode] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nama.trim() || !email.trim() || !password || !kode.trim()) {
      showToast('Isi semua kolom dulu', 'warning')
      return
    }
    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'warning')
      return
    }
    setBusy(true)
    const { error, butuhKonfirmasi } = await daftar(email.trim(), password, nama.trim(), noHp.trim(), kode.trim())
    setBusy(false)
    if (error) {
      showToast(error, 'danger')
      return
    }
    showToast(butuhKonfirmasi ? 'Akun dibuat! Cek email untuk konfirmasi, lalu tunggu persetujuan pengurus.' : 'Pendaftaran diterima! Tunggu persetujuan pengurus.', 'success')
    navigate('/masuk', { replace: true })
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="logo">🏘️</div>
        <h1>RumahKita</h1>
        <p>Daftar sebagai warga</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <h2>Daftar Warga</h2>
        <p className="auth-sub">Kode undangan didapat dari pengurus perumahan Anda.</p>
        <div className="form-group">
          <label className="form-label">Nama Lengkap</label>
          <input className="form-control" placeholder="Nama sesuai KTP" value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">No. HP (opsional)</label>
          <input className="form-control" type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" value={noHp} onChange={(e) => setNoHp(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" inputMode="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-control" type="password" autoComplete="new-password" placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Kode Undangan Perumahan</label>
          <input className="form-control" placeholder="Contoh: RUMAHKITA" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy} style={{ justifyContent: 'center', minHeight: 46 }}>
          {busy ? '⏳ Mendaftar...' : 'Daftar'}
        </button>
        <div className="auth-links">
          Sudah punya akun? <Link to="/masuk">Masuk di sini</Link>
        </div>
      </form>
    </div>
  )
}
