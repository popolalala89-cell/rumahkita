import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePwaInstall } from '../lib/pwa'
import { showToast } from '../lib/toast'
import NotifModal from '../components/NotifModal'
import { ROLE_LABEL } from '../lib/types'
import type { Role } from '../lib/types'

interface NavItem {
  id: string
  label: string
  icon: string
  route: string
  roles: Role[]
}

const ALL_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Beranda', icon: 'home', route: '/app', roles: ['warga', 'ketua', 'bendahara', 'sekretaris', 'satpam'] },
  { id: 'warga', label: 'Warga', icon: 'groups', route: '/app/warga', roles: ['ketua', 'bendahara', 'sekretaris'] },
  { id: 'iuran', label: 'Iuran', icon: 'payments', route: '/app/iuran', roles: ['ketua', 'bendahara', 'sekretaris'] },
  { id: 'kas', label: 'Kas', icon: 'account_balance', route: '/app/kas', roles: ['ketua', 'bendahara', 'sekretaris'] },
  { id: 'layanan', label: 'Layanan', icon: 'support_agent', route: '/app/layanan', roles: ['warga', 'ketua', 'bendahara', 'sekretaris'] },
  { id: 'komunitas', label: 'Komunitas', icon: 'campaign', route: '/app/komunitas', roles: ['warga', 'ketua', 'bendahara', 'sekretaris'] },
  { id: 'keamanan', label: 'Keamanan', icon: 'shield', route: '/app/keamanan', roles: ['ketua', 'bendahara', 'sekretaris', 'satpam'] },
  { id: 'aset', label: 'Aset', icon: 'inventory_2', route: '/app/aset', roles: ['ketua', 'bendahara', 'sekretaris'] },
  { id: 'dokumen', label: 'Dokumen', icon: 'folder', route: '/app/dokumen', roles: ['warga', 'ketua', 'bendahara', 'sekretaris'] },
  { id: 'pengaturan', label: 'Pengaturan', icon: 'settings', route: '/app/pengaturan', roles: ['ketua'] },
  { id: 'langganan', label: 'Langganan', icon: 'card_membership', route: '/app/langganan', roles: ['warga', 'ketua', 'bendahara', 'sekretaris'] },
  { id: 'permintaan', label: 'Permintaan', icon: 'inbox', route: '/app/permintaan', roles: ['super_admin'] },
  { id: 'kelola', label: 'Kelola Perumahan', icon: 'apartment', route: '/app/kelola', roles: ['super_admin'] },
]

export default function AdminLayout() {
  const { profile, perumahan, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { canInstall, promptInstall } = usePwaInstall()
  const [bannerHidden, setBannerHidden] = useState(() => sessionStorage.getItem('rk_pwa_hide') === '1')

  // white label: terapkan warna tema & judul tab sesuai perumahan
  useEffect(() => {
    const r = document.documentElement
    if (perumahan?.warna) {
      r.style.setProperty('--primary', perumahan.warna)
      r.style.setProperty('--primary-dark', perumahan.warna)
      r.style.setProperty('--primary-light', `color-mix(in srgb, ${perumahan.warna} 14%, white)`)
    }
    document.title = perumahan ? `${perumahan.nama} · RumahKita` : 'RumahKita'
    return () => {
      r.style.removeProperty('--primary')
      r.style.removeProperty('--primary-dark')
      r.style.removeProperty('--primary-light')
      document.title = 'RumahKita'
    }
  }, [perumahan?.warna, perumahan?.nama])

  const doInstall = async () => {
    const ok = await promptInstall()
    if (ok) showToast('RumahKita terpasang 🎉', 'success')
  }
  const hideBanner = () => {
    setBannerHidden(true)
    sessionStorage.setItem('rk_pwa_hide', '1')
  }

  const items = useMemo(
    () => ALL_ITEMS.filter((it) => profile && (profile.role === 'super_admin' || it.roles.includes(profile.role))),
    [profile]
  )
  const bottomItems = items.slice(0, 5)
  const current = items.find((it) => (it.route === '/app' ? location.pathname === '/app' : location.pathname.startsWith(it.route)))
  const title = current?.label ?? 'RumahKita'

  const handleLogout = async () => {
    await logout()
    navigate('/masuk', { replace: true })
  }

  // paksa label supaya pemilik langganan yang habis tetap bisa lihat status
  const expired =
    profile?.role !== 'super_admin' &&
    !!perumahan?.langganan_hingga &&
    new Date(perumahan.langganan_hingga + 'T23:59:59').getTime() < Date.now()
  if (expired) {
    return (
      <div className="app-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 42 }}>🔒</div>
          <h2>Langganan Berakhir</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Masa pakai RumahKita untuk <b>{perumahan?.nama}</b> sudah habis. Hubungi pengurus untuk memperpanjang.
          </p>
          <button className="btn btn-outline btn-block" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </div>
    )
  }

  const langgananInfo =
    profile != null &&
    profile.role !== 'super_admin' &&
    perumahan?.langganan_hingga
      ? `Langganan aktif sampai ${new Date(perumahan.langganan_hingga).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : null

  return (
    <div className="app-layout">
      <header className="top-app-bar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
          <span className="mat-icon">menu</span>
        </button>
        <span className="bar-title">{title}</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="bar-icon-btn"
            aria-label="Notifikasi"
            onClick={() => setNotifOpen(true)}
            style={{ background: 'transparent', border: 'none', padding: 8, cursor: 'pointer', color: 'inherit' }}
          >
            <span className="mat-icon">notifications</span>
          </button>
          <div className="bar-avatar">{(profile?.nama || '?').charAt(0).toUpperCase()}</div>
        </div>
      </header>

      <main className="tab-content">
        {!bannerHidden && canInstall && (
          <div
            style={{
              background: 'var(--primary)', color: '#fff', borderRadius: 12,
              padding: '10px 14px', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span className="mat-icon" style={{ fontSize: 20 }}>phone_iphone</span>
            <div style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600 }}>Pasang RumahKita di layar utama — buka langsung seperti aplikasi.</div>
            <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--primary)', minHeight: 30 }} onClick={doInstall}>
              Pasang
            </button>
            <button className="btn btn-sm" style={{ minHeight: 30, color: '#fff' }} onClick={hideBanner}>
              ✕
            </button>
          </div>
        )}
        {profile && !profile.aktif && (
                  <div
                    style={{
                      background: 'var(--warning)', color: '#fff', borderRadius: 12,
                      padding: '10px 14px', marginBottom: 12, fontSize: '0.78rem', fontWeight: 600,
                    }}
                  >
                    ⏳ Akun Anda menunggu persetujuan pengurus. Fitur aktif penuh setelah disetujui.
                  </div>
                )}
                {langgananInfo && (
                  <div
                    style={{
                      background: 'var(--primary)', color: '#fff', borderRadius: 12,
                      padding: '10px 14px', marginBottom: 12, fontSize: '0.78rem', fontWeight: 600,
                    }}
                  >
                    ⌛ {langgananInfo}.
                  </div>
                )}
                <Outlet />
      </main>

      <nav className="bottom-nav">
        {bottomItems.map((it) => (
          <NavLink
            key={it.id}
            to={it.route}
            end={it.route === '/app'}
            className={({ isActive }) => `bn-item${isActive ? ' active' : ''}`}
          >
            <span className="mat-icon">{it.icon}</span>
            <span className="bn-label">{it.label}</span>
          </NavLink>
        ))}
      </nav>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            {perumahan?.logo_url ? (
              <img src={perumahan.logo_url} alt="" style={{ height: 22, width: 22, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <span style={{ lineHeight: 1 }}>🏘️</span>
            )}
            <span>{perumahan?.nama ?? 'RumahKita'}</span>
          </div>
          <div className="brand-sub">{perumahan?.nama ?? '—'} · {profile ? ROLE_LABEL[profile.role] : ''}</div>
        </div>
        <nav className="sidebar-nav">
          {items.map((it) => (
            <NavLink
              key={it.id}
              to={it.route}
              end={it.route === '/app'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="mat-icon">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {canInstall && (
            <button className="nav-item" onClick={doInstall}>
              <span className="mat-icon">phone_iphone</span>
              <span>Pasang Aplikasi</span>
            </button>
          )}
          <button className="nav-item danger" onClick={handleLogout}>
            <span className="mat-icon">logout</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <NotifModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}
