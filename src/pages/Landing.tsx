import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatRp } from '../lib/format'
import type { PaketLangganan } from '../lib/types'
import '../landing.css'

const FITUR = [
  { icon: 'savings', judul: 'Iuran & Kas Digital', teks: 'Catat iuran bulanan, tunggakan, dan kas perumahan rapi otomatis. Tidak ada lagi buku catatan berserakan.' },
  { icon: 'receipt_long', judul: 'Tagihan & Keuangan', teks: 'Pantau pemasukan, pengeluaran, dan rekap keuangan perumahan dalam satu layar.' },
  { icon: 'campaign', judul: 'Pengumuman Warga', teks: 'Umumkan info penting ke semua warga sekaligus — kegiatan, jadwal, atau informasi mendadak.' },
  { icon: 'support_agent', judul: 'Layanan Warga', teks: 'Pengaduan, permintaan bantuan, dan layanan lain terekam jelas beserta statusnya.' },
  { icon: 'security', judul: 'Keamanan & Aset', teks: 'Jadwal ronda, catatan aset bersama, dan dokumen perumahan tersimpan aman.' },
  { icon: 'qr_code', judul: 'Iuran via QRIS', teks: 'Warga bayar iuran lewat QRIS, kirim bukti transfer, dan admin verifikasi sekali ketuk.' },
]

const LANGKAH = [
  { num: '1', judul: 'Daftarkan Perumahan', teks: 'Pengelola mendaftar, membuat kode undangan, dan membagikan ke warga.' },
  { num: '2', judul: 'Warga Bergabung', teks: 'Warga masuk memakai kode undangan lewat HP — tanpa instal aplikasi.' },
  { num: '3', judul: 'Kelola Setiap Hari', teks: 'Iuran, pengumuman, layanan, dan laporan keuangan berjalan otomatis.' },
]

const NILAI = [
  { num: '100%', label: 'Di HP & PWA' },
  { num: '1x', label: 'Daftar, langsung pakai' },
  { num: '24/7', label: 'Akses data perumahan' },
  { num: 'Rp0', label: 'Mulai gratis (uji coba)' },
]

export default function Landing() {
  const [pakets, setPakets] = useState<PaketLangganan[]>([])
  const [loadingPkt, setLoadingPkt] = useState(true)

  useEffect(() => {
    supabase
      .from('paket_langganan')
      .select('*')
      .eq('aktif', true)
      .order('harga', { ascending: true })
      .then(({ data }) => {
        if (data) setPakets(data as PaketLangganan[])
        setLoadingPkt(false)
      })
  }, [])

  return (
    <div className="lp-root">
      {/* Navbar */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <img src="/icons/app-192.png" alt="" className="logo-ico" /> RumahKita
          </div>
          <div className="lp-nav-links">
            <a href="#fitur" className="hide-sm">Fitur</a>
            <a href="#cara" className="hide-sm">Cara Kerja</a>
            <a href="#harga" className="hide-sm">Harga</a>
            <Link to="/masuk" className="lp-btn lp-btn-ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Masuk
            </Link>
            <Link to="/daftar" className="lp-btn lp-btn-white" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Daftar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <div className="lp-hero-inner">
          <div>
            <span className="lp-badge">
              <span className="mat-icon" style={{ fontSize: 16 }}>verified</span>
              Aplikasi manajemen perumahan pertama untuk komunitas Anda
            </span>
            <h1>Kelola perumahan jadi mudah, dari iuran sampai pengumuman</h1>
            <p className="lead">
              RumahKita menyatukan iuran, kas, pengumuman, layanan warga, dan pembayaran QRIS dalam satu aplikasi yang
              bisa dibuka siapa pun dari HP — tanpa instal.
            </p>
            <div className="lp-cta">
              <Link to="/daftar" className="lp-btn lp-btn-white">
                <span className="mat-icon">person_add</span> Daftar Sekarang
              </Link>
              <Link to="/mulai" className="lp-btn lp-btn-ghost">
                <span className="mat-icon">apartment</span> Untuk Pengelola Perumahan
              </Link>
            </div>
            <p className="lp-note">✓ Gratis dicoba · ✓ Tanpa instal aplikasi · ✓ Data aman</p>
          </div>

          {/* Mockup phone */}
          <div className="lp-mock">
            <div className="lp-mock-head">
              <span className="mat-icon">home</span> RumahKita — Griya Asri
            </div>
            <div className="lp-mock-row">
              <div className="lp-mock-cell"><span className="mat-icon">savings</span><b>Iuran</b></div>
              <div className="lp-mock-cell"><span className="mat-icon">campaign</span><b>Info</b></div>
              <div className="lp-mock-cell"><span className="mat-icon">groups</span><b>Warga</b></div>
            </div>
            <div className="lp-mock-row">
              <div className="lp-mock-cell"><span className="mat-icon">qr_code</span><b>QRIS</b></div>
              <div className="lp-mock-cell"><span className="mat-icon">receipt_long</span><b>Kas</b></div>
              <div className="lp-mock-cell"><span className="mat-icon">support_agent</span><b>Layanan</b></div>
            </div>
            <div className="lp-mock-bar" />
            <div className="lp-mock-bar w80" />
            <div style={{ marginTop: 10 }}>
              <span className="lp-mock-chip">✓ Iuran bulanan terbayar</span>
              <span className="lp-mock-chip">✓ Pengumuman terkirim</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-stats">
            {NILAI.map((s) => (
              <div className="lp-stat" key={s.label}>
                <b>{s.num}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="lp-section alt">
        <div className="lp-container">
          <span className="lp-eyebrow">Fitur</span>
          <h2 className="lp-title">Semua kebutuhan pengelolaan perumahan, di satu tempat</h2>
          <p className="lp-sub">Dari administrasi iuran sampai komunikasi warga — dirancang sederhana agar semua orang di perumahan bisa memakainya.</p>
          <div className="lp-grid cols3">
            {FITUR.map((f) => (
              <div className="lp-card" key={f.judul}>
                <div className="lp-card-ico"><span className="mat-icon">{f.icon}</span></div>
                <h3>{f.judul}</h3>
                <p>{f.teks}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section id="cara" className="lp-section">
        <div className="lp-container">
          <span className="lp-eyebrow">Cara Kerja</span>
          <h2 className="lp-title">Mulai dalam 3 langkah</h2>
          <p className="lp-sub">Tidak perlu teknisi, tidak perlu server. Cukup HP dan nomor WhatsApp.</p>
          <div className="lp-steps">
            {LANGKAH.map((s) => (
              <div className="lp-step" key={s.num}>
                <div className="lp-step-num">{s.num}</div>
                <h3>{s.judul}</h3>
                <p>{s.teks}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Harga */}
      <section id="harga" className="lp-section alt">
        <div className="lp-container">
          <span className="lp-eyebrow">Paket & Harga</span>
          <h2 className="lp-title">Langganan terjangkau untuk perumahan</h2>
          <p className="lp-sub">
            Satu langganan berlaku untuk seluruh warga perumahan Anda. Bayar lewat QRIS, langsung aktif.
          </p>
          {loadingPkt ? (
            <div className="loading-screen" style={{ minHeight: 120 }}>
              <div className="spinner" />
            </div>
          ) : pakets.length === 0 ? (
            <p className="lp-sub">Daftar paket sedang disiapkan.</p>
          ) : (
            <div className="lp-price">
              {pakets.map((p, i) => (
                <div className={`lp-price-card${i === 1 ? ' pop' : ''}`} key={p.id}>
                  {i === 1 && <span className="lp-pop-badge">PALING POPULER</span>}
                  <span className="pk-name">{p.nama}</span>
                  <span className="lp-durasi">{p.durasi_hari} hari langganan</span>
                  <div className="lp-harga">
                    {formatRp(p.harga)} <small>/ periode</small>
                  </div>
                  <p className="pk-desc">{p.deskripsi || `Aktifkan aplikasi perumahan Anda selama ${p.durasi_hari} hari.`}</p>
                  <Link to="/daftar" className="lp-btn lp-btn-ghost" style={{ background: i === 1 ? 'var(--primary)' : 'var(--surface)', color: i === 1 ? '#fff' : 'var(--primary)', border: i === 1 ? 'none' : '1px solid var(--border)' }}>
                    Mulai Sekarang
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA besar */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-cta-band">
            <h2>Siap merapikan pengelolaan perumahan Anda?</h2>
            <p>Daftar sekarang, undang warga Anda, dan rasakan bedanya dalam 5 menit.</p>
            <Link to="/mulai" className="lp-btn lp-btn-white">
              <span className="mat-icon">apartment</span> Daftarkan Perumahan
            </Link>
            <Link to="/daftar" className="lp-btn lp-btn-ghost">
              <span className="mat-icon">person_add</span> Saya Warga — Masuk Kode
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <h4>
              <img src="/icons/app-192.png" alt="" style={{ height: 20, width: 20, verticalAlign: 'middle', marginRight: 6, borderRadius: 4 }} /> RumahKita
            </h4>
            <p>
              Aplikasi manajemen perumahan berbasis web — bisa dibuka dari HP, tablet, maupun komputer. Data tersimpan
              aman di cloud, siap dipakai kapan saja.
            </p>
          </div>
          <div>
            <h4>Fitur</h4>
            <ul>
              <li><a href="#fitur">Iuran &amp; Kas</a></li>
              <li><a href="#fitur">Pengumuman Warga</a></li>
              <li><a href="#fitur">Layanan &amp; Keamanan</a></li>
              <li><a href="#harga">Pembayaran QRIS</a></li>
            </ul>
          </div>
          <div>
            <h4>Mulai</h4>
            <ul>
              <li><Link to="/masuk">Masuk</Link></li>
              <li><Link to="/daftar">Daftar Warga</Link></li>
              <li><Link to="/mulai">Daftarkan Perumahan</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}