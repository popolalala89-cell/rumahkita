import { Link } from 'react-router-dom'

export default function EntryScreen() {
  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="logo">🏘️</div>
        <h1>RumahKita</h1>
        <p>Manajemen perumahan — iuran, pengumuman, layanan warga</p>
      </div>
      <div className="auth-card">
        <h2>Selamat datang 👋</h2>
        <p className="auth-sub">Masuk atau daftar untuk mengakses aplikasi perumahan Anda.</p>
        <Link to="/masuk" className="btn btn-primary btn-block" style={{ justifyContent: 'center' }}>
          <span className="mat-icon">login</span> Masuk
        </Link>
        <div style={{ height: 10 }} />
        <Link to="/daftar" className="btn btn-outline btn-block" style={{ justifyContent: 'center' }}>
          <span className="mat-icon">person_add</span> Daftar Warga Baru
        </Link>
        <div style={{ height: 10 }} />
        <Link to="/mulai" className="btn btn-outline btn-block" style={{ justifyContent: 'center' }}>
          <span className="mat-icon">apartment</span> Untuk Perumahan Baru — Mulai di Sini
        </Link>
        <div className="auth-links">
          Butuh bantuan? Hubungi pengurus perumahan Anda.
        </div>
      </div>
    </div>
  )
}
