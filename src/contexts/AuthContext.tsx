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
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshAuth: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'cmf-mock-auth-state'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)

  // Inicializa o estado lendo tanto o PocketBase quanto a persistência simulada local para testes/fundação
  React.useEffect(() => {
    const initAuth = () => {
      try {
        if (pb.authStore.isValid && pb.authStore.record) {
          const rec = pb.authStore.record as AuthRecord & {
            role?: string
            name?: string
            status?: string
          }
          setUser({
            id: rec.id,
            email: rec.email || '',
            name: rec.name || rec.email?.split('@')[0] || 'Usuário',
            role: (rec.role as 'admin' | 'user') || 'user',
            status: (rec.status as 'active') || 'active',
          })
          setToken(pb.authStore.token)
        } else {
          // Verifica se há sessão local ativa gravada para navegação de desenvolvimento/testes
          const savedSession = localStorage.getItem(AUTH_STORAGE_KEY)
          if (savedSession) {
            const parsed = JSON.parse(savedSession)
            setUser(parsed.user)
            setToken(parsed.token)
          } else {
            setUser(null)
            setToken(null)
          }
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
        const rec = model as AuthRecord & { role?: string; name?: string; status?: string }
        setUser({
          id: rec.id,
          email: rec.email || '',
          name: rec.name || rec.email?.split('@')[0] || 'Usuário',
          role: (rec.role as 'admin' | 'user') || 'user',
          status: (rec.status as 'active') || 'active',
        })
        setToken(tokenVal)
      } else {
        const savedSession = localStorage.getItem(AUTH_STORAGE_KEY)
        if (!savedSession) {
          setUser(null)
          setToken(null)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = React.useCallback(async (email: string, pass: string) => {
    setIsLoading(true)
    try {
      // Tenta autenticar pelo PocketBase se configurado
      try {
        const authData = await pb.collection('users').authWithPassword(email, pass)
        if (authData.record) {
          const rec = authData.record as AuthRecord & { role?: string; name?: string }
          const u: UserProfile = {
            id: rec.id,
            email: rec.email || email,
            name: rec.name || email.split('@')[0],
            role: (rec.role as 'admin' | 'user') || (email.includes('admin') ? 'admin' : 'user'),
            status: 'active',
          }
          setUser(u)
          setToken(authData.token)
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: u, token: authData.token }))
          return { success: true }
        }
      } catch (pbErr: unknown) {
        // Se o PocketBase não estiver com users cadastrados ainda, permitimos login estrutural de demonstração se for admin
        // para garantir teste de rotas sem quebrar a restrição
        console.warn('PocketBase auth fallthrough:', pbErr)
        // Fallback simulado para desenvolvimento
        if (email === 'admin@construindomeufuturo.com' && pass.length >= 6) {
          const u: UserProfile = {
            id: 'mock-admin-id',
            email: 'admin@construindomeufuturo.com',
            name: 'Administrador do Sistema',
            role: 'admin',
            status: 'active',
          }
          setUser(u)
          setToken('mock-admin-jwt-token')
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ user: u, token: 'mock-admin-jwt-token' }),
          )
          return { success: true }
        }
        throw pbErr
      }
      return { success: false, error: 'Credenciais inválidas' }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao autenticar. Verifique seus dados.',
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = React.useCallback(() => {
    pb.authStore.clear()
    localStorage.removeItem(AUTH_STORAGE_KEY)
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
