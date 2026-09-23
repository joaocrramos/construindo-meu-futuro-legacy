import * as React from 'react'
import pb from '@/lib/pocketbase/client'
import type { AuthRecord } from 'pocketbase'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  status?: 'active' | 'suspended' | 'pending'
  avatar?: string
  phone?: string
  must_change_password?: boolean
  created?: string
  updated?: string
  last_login?: string
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  login: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string; must_change_password?: boolean }>
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)

  // Inicializa o estado lendo exclusivamente a sessão válida do PocketBase
  React.useEffect(() => {
    const initAuth = () => {
      try {
        if (pb.authStore.isValid && pb.authStore.record) {
          const rec = pb.authStore.record as AuthRecord & {
            role?: string
            name?: string
            status?: string
            must_change_password?: boolean
          }
          setUser({
            id: rec.id,
            email: rec.email || '',
            name: rec.name || rec.email?.split('@')[0] || 'Usuário',
            role: (rec.role as 'admin' | 'user') || 'user',
            status: (rec.status as 'active') || 'active',
            must_change_password: Boolean(rec.must_change_password),
          })
          setToken(pb.authStore.token)
        } else {
          setUser(null)
          setToken(null)
        }
      } catch {
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Ouve alterações no store do PocketBase
    const unsubscribe = pb.authStore.onChange((tokenVal, model) => {
      if (tokenVal && model) {
        const rec = model as AuthRecord & {
          role?: string
          name?: string
          status?: string
          must_change_password?: boolean
        }
        setUser({
          id: rec.id,
          email: rec.email || '',
          name: rec.name || rec.email?.split('@')[0] || 'Usuário',
          role: (rec.role as 'admin' | 'user') || 'user',
          status: (rec.status as 'active') || 'active',
          must_change_password: Boolean(rec.must_change_password),
        })
        setToken(tokenVal)
      } else {
        setUser(null)
        setToken(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = React.useCallback(async (email: string, pass: string) => {
    setIsLoading(true)
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass)
      if (authData.record) {
        const rec = authData.record as AuthRecord & {
          role?: string
          name?: string
          status?: string
          must_change_password?: boolean
        }
        const u: UserProfile = {
          id: rec.id,
          email: rec.email || email,
          name: rec.name || email.split('@')[0],
          role: (rec.role as 'admin' | 'user') || 'user',
          status: (rec.status as 'active') || 'active',
          must_change_password: Boolean(rec.must_change_password),
        }
        setUser(u)
        setToken(authData.token)
        return {
          success: true,
          must_change_password: Boolean(rec.must_change_password),
        }
      }
      return { success: false, error: 'Credenciais inválidas' }
    } catch {
      return {
        success: false,
        error:
          'Credenciais inválidas ou serviço de autenticação indisponível. Verifique seus dados.',
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = React.useCallback(() => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }, [])

  const refreshAuth = React.useCallback(async () => {
    try {
      if (pb.authStore.isValid) {
        await pb.collection('users').authRefresh()
      }
    } catch {
      logout()
    }
  }, [logout])

  const value = React.useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
      isLoading,
      login,
      logout,
      refreshAuth,
    }),
    [user, token, isLoading, login, logout, refreshAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
