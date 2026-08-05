import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { showToast } from '../lib/toast'

/**
 * Dua mode:
 * 1. Mode recovery — user datang dari link reset password Supabase (isRecovery=true),
 *    langsung disuruh bikin password baru.
 * 2. Mode lupa password — form isi email, nanti dikirim link reset.
 */
export default function ResetPassword() {
  const { isRecovery, user, resetPassword, updatePassword, logout } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [busy, setBusy] = useState(false)

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      showToast('Isi email dulu', 'warning')
      return
    }
    setBusy(true)
    const { error } = await resetPassword(email.trim())
    setBusy(false)
    if (error) {
      showToast(error, 'danger')
      return
    }
    showToast('Link reset terkirim — cek email kamu', 'success')
    navigate('/masuk', { replace: true })
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pass.length < 6) {
      showToast('Password minimal 6 karakter', 'warning')
      return
    }
    if (pass !== pass2) {
      showToast('Konfirmasi password tidak sama', 'warning')
      return
    }
    setBusy(true)
    const { error } = await updatePassword(pass)
    setBusy(false)
    if (error) {
      showToast(error, 'danger')
      return
    }
    showToast('Password berhasil diubah! Silakan masuk.', 'success')
    await logout()
    navigate('/masuk', { replace: true })
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="logo">🏘️</div>
        <h1>RumahKita</h1>
        <p>{isRecovery ? 'Buat password baru' : 'Atur ulang password'}</p>
      </div>

      {isRecovery ? (
        <form className="auth-card" onSubmit={submitPassword}>
          <h2>Buat Password Baru</h2>
          <p className="auth-sub">
            Halo {user?.email ?? ''} — karena ini link reset, langsung buat password baru di bawah.
          </p>
          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input
              className="form-control"
              type="password"
              autoComplete="new-password"
              placeholder="Minimal 6 karakter"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ulangi Password</label>
            <input
              className="form-control"
              type="password"
              autoComplete="new-password"
              placeholder="Ketik ulang password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy} style={{ justifyContent: 'center', minHeight: 46 }}>
            {busy ? '⏳ Menyimpan...' : 'Simpan Password Baru'}
          </button>
          <div className="auth-links">
            <Link to="/masuk">Kembali ke halaman masuk</Link>
          </div>
        </form>
      ) : (
        <form className="auth-card" onSubmit={submitEmail}>
          <h2>Lupa Password</h2>
          <p className="auth-sub">Masukkan email terdaftar — kami kirim link untuk membuat password baru.</p>
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
          <button className="btn btn-primary btn-block" disabled={busy} style={{ justifyContent: 'center', minHeight: 46 }}>
            {busy ? '⏳ Mengirim...' : 'Kirim Link Reset'}
          </button>
          <div className="auth-links">
            <Link to="/masuk">Kembali ke halaman masuk</Link>
          </div>
        </form>
      )}
    </div>
  )
}
