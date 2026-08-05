import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { showToast } from '../lib/toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      showToast('Isi email & password dulu', 'warning')
      return
    }
    setBusy(true)
    const { error } = await login(email.trim(), password)
    setBusy(false)
    if (error) {
      showToast(error, 'danger')
      return
    }
    showToast('Berhasil masuk 👋', 'success')
    navigate('/app', { replace: true })
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="logo">🏘️</div>
        <h1>RumahKita</h1>
        <p>Masuk ke akun Anda</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <h2>Masuk</h2>
        <p className="auth-sub">Gunakan email & password yang didaftarkan ke pengurus.</p>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-control"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-control"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy} style={{ justifyContent: 'center', minHeight: 46 }}>
          {busy ? '⏳ Masuk...' : 'Masuk'}
        </button>
        <div className="auth-links">
          Belum punya akun? <Link to="/daftar">Daftar di sini</Link>
        </div>
      </form>
    </div>
  )
}
