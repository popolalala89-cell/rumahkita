import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { Profile, Perumahan, Role } from './types'

interface AuthState {
  loading: boolean
  user: { id: string; email: string } | null
  profile: Profile | null
  perumahan: Perumahan | null
  login: (email: string, password: string) => Promise<{ error: string | null }>
  daftar: (email: string, password: string, nama: string, noHp: string, kode: string) => Promise<{ error: string | null; butuhKonfirmasi?: boolean }>
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

  useEffect(() => {
    let alive = true
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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
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

  const hasRole = (...roles: Role[]) => {
    if (profile?.role === 'super_admin') return true
    return !!profile && roles.includes(profile.role)
  }

  return (
    <AuthContext.Provider value={{ loading, user, profile, perumahan, login, daftar, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}
