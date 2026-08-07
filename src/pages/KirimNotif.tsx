import KirimNotifPanel from '../components/KirimNotifPanel'

// Halaman kirim notifikasi (web push) — khusus pengurus perumahan
// (ketua/bendahara/sekretaris) + super admin. Isi penuh di panel komponen.
export default function KirimNotifPage() {
  return (
    <div style={{ padding: 2 }}>
      <KirimNotifPanel />
    </div>
  )
}