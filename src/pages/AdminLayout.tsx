import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
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
]

export default function AdminLayout() {
  const { profile, perumahan, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  return (
    <div className="app-layout">
      <header className="top-app-bar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
          <span className="mat-icon">menu</span>
        </button>
        <span className="bar-title">{title}</span>
        <div className="bar-avatar">{(profile?.nama || '?').charAt(0).toUpperCase()}</div>
      </header>

      <main className="tab-content">
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
            <span>🏘️</span> RumahKita
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
          <button className="nav-item danger" onClick={handleLogout}>
            <span className="mat-icon">logout</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </div>
  )
}
