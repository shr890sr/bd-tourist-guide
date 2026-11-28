import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'

type AuthUser = { id: number; email: string; role: string }
type AuthResponse = { access_token: string; token_type: string; role?: string; user?: AuthUser }
type AuthContextValue = { token: string | null; role: string | null; user: AuthUser | null; authLoading: boolean; signIn: (data: AuthResponse) => void; updateUser: (user: AuthUser) => void; signOut: () => Promise<void> }

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const TOKEN_KEY = 'access_token'
const USER_KEY = 'auth_user'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) as AuthUser : null
  })
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    function onTokenRefreshed(event: Event) {
      const refreshedToken = (event as CustomEvent<string>).detail
      if (refreshedToken) setToken(refreshedToken)
    }
    function onSessionExpired() {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('auth:token-refreshed', onTokenRefreshed)
    window.addEventListener('auth:session-expired', onSessionExpired)
    return () => {
      window.removeEventListener('auth:token-refreshed', onTokenRefreshed)
      window.removeEventListener('auth:session-expired', onSessionExpired)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setAuthLoading(false)
      return
    }
    let active = true
    setAuthLoading(true)
    api.get<AuthUser>('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (!active) return
        // The /me response is authoritative, including its role; don't retain
        // a potentially stale role from the user object loaded from storage.
        const authenticatedUser = { ...data, role: data.role || 'user' }
        localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser))
        setUser(authenticatedUser)
      })
      .catch(() => {
        if (!active) return
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => { if (active) setAuthLoading(false) })
    return () => { active = false }
  }, [token])

  function signIn(data: AuthResponse) {
    const authenticatedUser = data.user
      ? { ...data.user, role: data.role || data.user.role || 'user' }
      : null
    localStorage.setItem(TOKEN_KEY, data.access_token)
    if (authenticatedUser) localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser))
    else localStorage.removeItem(USER_KEY)
    setToken(data.access_token)
    setUser(authenticatedUser)
    setAuthLoading(true)
  }

  async function signOut() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Clear the local session even if the API is unavailable during logout.
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    }
  }

  function updateUser(updatedUser: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  const value = useMemo(() => ({ token, role: user?.role ?? null, user, authLoading, signIn, updateUser, signOut }), [token, user, authLoading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
