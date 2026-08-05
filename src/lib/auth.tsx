import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { Profile, Perumahan, Role } from './types'

interface AuthState {
  loading: boolean
  user: { id: string; email: string } | null
  profile: Profile | null
  perumahan: Perumahan | null
  isRecovery: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  daftar: (email: string, password: string, nama: string, noHp: string, kode: string) => Promise<{ error: string | null; butuhKonfirmasi?: boolean }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState)
export const useAuth = () => useContext(AuthContext)

async function loadProfile(userId: string): Promise<{ profile: Profile | null; perumahan: Perumahan | null }> {
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (!profile) return { profile: null, perumahan: null }
    const { data: perumahan } = await supabase
      .from('perumahan')
      .select('*')
      .eq('id', profile.perumahan_id)
      .maybeSingle()
    return { profile, perumahan }
  } catch {
    return { profile: null, perumahan: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [perumahan, setPerumahan] = useState<Perumahan | null>(null)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    let alive = true
    // deteksi link reset password (type=recovery) sebelum supabase-js membersihkan hash URL
    if (window.location.hash.includes('type=recovery')) setIsRecovery(true)
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      const u = data.session?.user ?? null
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      if (u) {
        loadProfile(u.id).then(({ profile: p, perumahan: pr }) => {
          if (!alive) return
          setProfile(p)
          setPerumahan(pr)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setIsRecovery(false)
      if (u) {
        loadProfile(u.id).then(({ profile: p, perumahan: pr }) => {
          if (!alive) return
          setProfile(p)
          setPerumahan(pr)
        })
      } else {
        setProfile(null)
        setPerumahan(null)
      }
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? (error.message === 'Invalid login credentials' ? 'Email atau password salah' : error.message) : null }
  }

  const daftar = async (email: string, password: string, nama: string, noHp: string, kode: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'Pendaftaran gagal, coba lagi' }
    const { error: rpcErr } = await supabase.rpc('daftar_profile', {
      p_nama: nama,
      p_no_hp: noHp,
      p_kode_undangan: kode,
    })
    if (rpcErr) return { error: rpcErr.message }
    const butuhKonfirmasi = !data.session
    return { error: null, butuhKonfirmasi }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  // URL akar aplikasi (biar link reset diarahkan ke app, bukan localhost:3000)
  const appUrl = () => {
    const segs = window.location.pathname.split('/').filter(Boolean)
    const known = ['masuk', 'daftar', 'reset-password', 'app']
    if (segs.length && known.includes(segs[segs.length - 1])) segs.pop()
    return window.location.origin + '/' + segs.join('/') + '/'
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() })
    return { error: error ? error.message : null }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? error.message : null }
  }

  const hasRole = (...roles: Role[]) => {
    if (profile?.role === 'super_admin') return true
    return !!profile && roles.includes(profile.role)
  }

  return (
    <AuthContext.Provider value={{ loading, user, profile, perumahan, isRecovery, login, daftar, resetPassword, updatePassword, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}
