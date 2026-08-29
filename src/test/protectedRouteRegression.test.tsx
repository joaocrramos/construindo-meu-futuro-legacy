import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

// O guard é testado em isolamento: o hook de autenticação é mockado para que
// cada estado (carregando / anônimo / autenticado / admin) possa ser exercido
// diretamente, sem depender de um PocketBase real.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

type AuthState = {
  isAuthenticated?: boolean
  isAdmin?: boolean
  isLoading?: boolean
}

function setAuthState({ isAuthenticated = false, isAdmin = false, isLoading = false }: AuthState) {
  mockedUseAuth.mockReturnValue({
    user: null,
    token: null,
    isAuthenticated,
    isAdmin,
    isLoading,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>)
}

// Renderiza a rota protegida dentro de um roteador com destinos de redirecionamento
// reais, para que o resultado do guard seja observável pela tela efetivamente montada.
function renderGuardedRoute({ requireAdmin = false }: { requireAdmin?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <ProtectedRoute requireAdmin={requireAdmin}>
              <div data-testid="conteudo-protegido">Conteúdo Protegido</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div data-testid="tela-login">Tela de Login</div>} />
        <Route path="/dashboard" element={<div data-testid="tela-dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Testes de Regressão do Guard de Rotas (ProtectedRoute)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Usuário anônimo é redirecionado para /login e não vê o conteúdo protegido', () => {
    setAuthState({ isAuthenticated: false })
    renderGuardedRoute()

    expect(screen.queryByTestId('tela-login')).not.toBeNull()
    expect(screen.queryByTestId('conteudo-protegido')).toBeNull()
  })

  it('2. Enquanto a autenticação carrega, nada é liberado nem redirecionado', () => {
    setAuthState({ isLoading: true })
    renderGuardedRoute()

    expect(screen.queryByText(/Verificando credenciais de acesso/i)).not.toBeNull()
    expect(screen.queryByTestId('conteudo-protegido')).toBeNull()
    expect(screen.queryByTestId('tela-login')).toBeNull()
  })

  it('3. Usuário autenticado sem papel admin acessa rota comum', () => {
    setAuthState({ isAuthenticated: true, isAdmin: false })
    renderGuardedRoute()

    expect(screen.queryByTestId('conteudo-protegido')).not.toBeNull()
    expect(screen.queryByTestId('tela-login')).toBeNull()
  })

  it('4. Usuário autenticado sem papel admin é barrado em rota requireAdmin', () => {
    setAuthState({ isAuthenticated: true, isAdmin: false })
    renderGuardedRoute({ requireAdmin: true })

    expect(screen.queryByTestId('tela-dashboard')).not.toBeNull()
    expect(screen.queryByTestId('conteudo-protegido')).toBeNull()
  })

  it('5. Usuário autenticado com papel admin acessa rota requireAdmin', () => {
    setAuthState({ isAuthenticated: true, isAdmin: true })
    renderGuardedRoute({ requireAdmin: true })

    expect(screen.queryByTestId('conteudo-protegido')).not.toBeNull()
    expect(screen.queryByTestId('tela-dashboard')).toBeNull()
  })

  it('6. Usuário anônimo com flag isAdmin nunca acessa rota administrativa', () => {
    // Cenário de defesa em profundidade: mesmo que isAdmin venha verdadeiro de
    // uma fonte inesperada, a ausência de autenticação precisa prevalecer.
    setAuthState({ isAuthenticated: false, isAdmin: true })
    renderGuardedRoute({ requireAdmin: true })

    expect(screen.queryByTestId('tela-login')).not.toBeNull()
    expect(screen.queryByTestId('conteudo-protegido')).toBeNull()
    expect(screen.queryByTestId('tela-dashboard')).toBeNull()
  })
})
