import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { ToastHost } from './lib/toast'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Daftar from './pages/Daftar'
import ResetPassword from './pages/ResetPassword'
import MulaiPage from './pages/Mulai'
import AdminLayout from './pages/AdminLayout'
import Dashboard from './pages/Dashboard'
import WargaPage from './pages/Warga'
import IuranPage from './pages/Iuran'
import KasPage from './pages/Kas'
import KomunitasPage from './pages/Komunitas'
import LayananPage from './pages/Layanan'
import KeamananPage from './pages/Keamanan'
import AsetPage from './pages/Aset'
import DokumenPage from './pages/Dokumen'
import PengaturanPage from './pages/Pengaturan'
import KelolaPerumahanPage from './pages/KelolaPerumahan'
import KirimNotifPage from './pages/KirimNotif'
import LanggananPage from './pages/Langganan'
import PermintaanPage from './pages/Permintaan'
import Placeholder from './pages/Placeholder'

function Loading() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <div>Memuat RumahKita...</div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/masuk" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  const { isRecovery } = useAuth()
  // sesi dari link reset password aktif → paksa tampilkan form password baru
  if (isRecovery) return <ResetPassword />
  return (
    <>
      <ToastHost />
      <Routes>
        <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
        <Route path="/masuk" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/daftar" element={<PublicOnly><Daftar /></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
        <Route path="/mulai" element={<MulaiPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="warga" element={<WargaPage />} />
          <Route path="iuran" element={<IuranPage />} />
          <Route path="kas" element={<KasPage />} />
          <Route path="komunitas" element={<KomunitasPage />} />
          <Route path="layanan" element={<LayananPage />} />
          <Route path="keamanan" element={<KeamananPage />} />
          <Route path="aset" element={<AsetPage />} />
          <Route path="dokumen" element={<DokumenPage />} />
          <Route path="pengaturan" element={<PengaturanPage />} />
          <Route path="langganan" element={<LanggananPage />} />
          <Route path="permintaan" element={<PermintaanPage />} />
          <Route path="kelola" element={<KelolaPerumahanPage />} />
          <Route path="notifikasi" element={<KirimNotifPage />} />
          <Route path="*" element={<Placeholder />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
