import axios from 'axios'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type AuthUser = { id: number; email: string; role: string }
type AuthResponse = { access_token: string; token_type: string; role?: string; user?: AuthUser }
type AuthContextValue = { token: string | null; role: string | null; user: AuthUser | null; authLoading: boolean; signIn: (data: AuthResponse) => void; signOut: () => void }

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const TOKEN_KEY = 'access_token'
const USER_KEY = 'auth_user'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) as AuthUser : null
  })
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    if (!token) {
      setAuthLoading(false)
      return
    }
    let active = true
    setAuthLoading(true)
    axios.get<AuthUser>(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (!active) return
        localStorage.setItem(USER_KEY, JSON.stringify(data))
        setUser(data)
      })
      .catch(() => {
        if (!active) return
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        delete axios.defaults.headers.common.Authorization
        setToken(null)
        setUser(null)
      })
      .finally(() => { if (active) setAuthLoading(false) })
    return () => { active = false }
  }, [token])

  function signIn(data: AuthResponse) {
    const authenticatedUser = data.user
      ? { ...data.user, role: data.user.role || data.role || 'user' }
      : null
    localStorage.setItem(TOKEN_KEY, data.access_token)
    if (authenticatedUser) localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser))
    else localStorage.removeItem(USER_KEY)
    setToken(data.access_token)
    setUser(authenticatedUser)
    setAuthLoading(true)
    axios.defaults.headers.common.Authorization = `Bearer ${data.access_token}`
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    delete axios.defaults.headers.common.Authorization
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, role: user?.role ?? null, user, authLoading, signIn, signOut }), [token, user, authLoading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
