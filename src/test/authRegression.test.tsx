import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'

// Componente auxiliar para testar o hook useAuth
function AuthConsumer({
  onAuthReady,
}: {
  onAuthReady?: (auth: ReturnType<typeof useAuth>) => void
}) {
  const auth = useAuth()
  React.useEffect(() => {
    if (onAuthReady) {
      onAuthReady(auth)
    }
  }, [auth, onAuthReady])

  return (
    <div>
      <span data-testid="is-auth">{auth.isAuthenticated ? 'true' : 'false'}</span>
      <span data-testid="is-admin">{auth.isAdmin ? 'true' : 'false'}</span>
      <span data-testid="user-role">{auth.user?.role || 'none'}</span>
      <span data-testid="user-email">{auth.user?.email || 'none'}</span>
      <span data-testid="token">{auth.token || 'none'}</span>
    </div>
  )
}

describe('Testes de Regressão da Autenticação e Segurança', () => {
  beforeEach(() => {
    pb.authStore.clear()
    vi.restoreAllMocks()
  })

  it('1. Falha do PocketBase nunca resulta em login bem-sucedido', async () => {
    vi.spyOn(pb.collection('users'), 'authWithPassword').mockRejectedValueOnce(
      new Error('Invalid credentials or network failure'),
    )

    let authContextRef: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthConsumer
          onAuthReady={(auth) => {
            authContextRef = auth
          }}
        />
      </AuthProvider>,
    )

    let result: { success: boolean; error?: string } = { success: true }
    await act(async () => {
      if (authContextRef) {
        result = await authContextRef.login('usuario@exemplo.com', 'senha_errada')
      }
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(pb.authStore.isValid).toBe(false)
  })

  it('2. Falha do PocketBase nunca cria sessão', async () => {
    vi.spyOn(pb.collection('users'), 'authWithPassword').mockRejectedValueOnce(
      new Error('Network error'),
    )

    let authContextRef: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthConsumer
          onAuthReady={(auth) => {
            authContextRef = auth
          }}
        />
      </AuthProvider>,
    )

    await act(async () => {
      if (authContextRef) {
        await authContextRef.login('qualquer@exemplo.com', '123456')
      }
    })

    expect(authContextRef?.isAuthenticated).toBe(false)
    expect(authContextRef?.user).toBeNull()
  })

  it('3. Falha do PocketBase nunca grava token', async () => {
    vi.spyOn(pb.collection('users'), 'authWithPassword').mockRejectedValueOnce(
      new Error('401 Unauthorized'),
    )

    let authContextRef: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthConsumer
          onAuthReady={(auth) => {
            authContextRef = auth
          }}
        />
      </AuthProvider>,
    )

    await act(async () => {
      if (authContextRef) {
        await authContextRef.login('hacker@tentativa.com', 'senha_invalida')
      }
    })

    expect(authContextRef?.token).toBeNull()
    expect(pb.authStore.token).toBe('')
  })

  it('4. Falha do PocketBase nunca concede role', async () => {
    vi.spyOn(pb.collection('users'), 'authWithPassword').mockRejectedValueOnce(
      new Error('Failed login'),
    )

    let authContextRef: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthConsumer
          onAuthReady={(auth) => {
            authContextRef = auth
          }}
        />
      </AuthProvider>,
    )

    await act(async () => {
      if (authContextRef) {
        await authContextRef.login('test@test.com', 'wrong')
      }
    })

    expect(authContextRef?.user?.role).toBeUndefined()
  })

  it('5. Falha do PocketBase nunca concede acesso administrativo', async () => {
    vi.spyOn(pb.collection('users'), 'authWithPassword').mockRejectedValueOnce(
      new Error('Invalid login'),
    )

    let authContextRef: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthConsumer
          onAuthReady={(auth) => {
            authContextRef = auth
          }}
        />
      </AuthProvider>,
    )

    await act(async () => {
      if (authContextRef) {
        await authContextRef.login('admin@construindomeufuturo.com', 'senha_incorreta')
      }
    })

    expect(authContextRef?.isAdmin).toBe(false)
  })

  it('6. isAdmin nunca retorna verdadeiro sem papel administrativo de fonte confiável', () => {
    let authContextRef: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthConsumer
          onAuthReady={(auth) => {
            authContextRef = auth
          }}
        />
      </AuthProvider>,
    )

    // Sem sessão
    expect(authContextRef?.isAdmin).toBe(false)

    // Com usuário com role regular 'user'
    act(() => {
      pb.authStore.save('valid-mock-token-for-test', {
        id: 'usr_123',
        email: 'regular@exemplo.com',
        role: 'user',
        name: 'Usuário Normal',
      } as any)
    })

    expect(authContextRef?.isAdmin).toBe(false)

    // Apenas quando role for estritamente 'admin'
    act(() => {
      pb.authStore.save('valid-mock-token-for-test', {
        id: 'adm_123',
        email: 'admin@exemplo.com',
        role: 'admin',
        name: 'Administrador Real',
      } as any)
    })

    expect(authContextRef?.isAdmin).toBe(true)
  })

  it('7. Senha incorreta nunca resulta em sucesso', async () => {
    vi.spyOn(pb.collection('users'), 'authWithPassword').mockRejectedValueOnce({
      status: 400,
      message: 'Failed to authenticate.',
    })

    let authContextRef: ReturnType<typeof useAuth> | null = null
    render(
      <AuthProvider>
        <AuthConsumer
          onAuthReady={(auth) => {
            authContextRef = auth
          }}
        />
      </AuthProvider>,
    )

    let res: { success: boolean; error?: string } = { success: true }
    await act(async () => {
      if (authContextRef) {
        res = await authContextRef.login('titular@teste.com', 'senha_errada')
      }
    })

    expect(res.success).toBe(false)
    expect(authContextRef?.isAuthenticated).toBe(false)
  })

  it('8. Sessão mockada e token fixo não existem no estado inicial', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('is-auth').textContent).toBe('false')
    expect(screen.getByTestId('is-admin').textContent).toBe('false')
    expect(screen.getByTestId('user-role').textContent).toBe('none')
    expect(screen.getByTestId('user-email').textContent).toBe('none')
    expect(screen.getByTestId('token').textContent).toBe('none')
  })
})
