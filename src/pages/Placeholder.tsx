import { Link, useLocation } from 'react-router-dom'

const LABEL: Record<string, string> = {
  warga: 'Data Warga & Rumah',
  iuran: 'Iuran & Tagihan',
  kas: 'Kas & Keuangan',
  layanan: 'Layanan Warga',
  komunitas: 'Komunitas',
  keamanan: 'Keamanan',
  aset: 'Aset & Infrastruktur',
  dokumen: 'Dokumen & Kontak',
  pengaturan: 'Pengaturan',
}

export default function Placeholder() {
  const seg = useLocation().pathname.split('/')[2] ?? ''
  return (
    <div className="tab-page">
      <div className="card" style={{ marginTop: 8 }}>
        <div className="empty-state">
          <span className="mat-icon">construction</span>
          <p style={{ fontWeight: 600, color: 'var(--text)' }}>{LABEL[seg] ?? 'Modul ini'}</p>
          <p>Masih dalam pembangunan — akan segera hadir di fase berikutnya.</p>
          <div style={{ height: 12 }} />
          <Link to="/app" className="btn btn-outline btn-sm">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
