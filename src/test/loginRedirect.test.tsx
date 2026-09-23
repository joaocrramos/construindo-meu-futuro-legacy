import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LoginPage from '@/pages/public/Login'
import { useAuth } from '@/contexts/AuthContext'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

describe('Redirecionamento pós-login com must_change_password', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      refreshAuth: vi.fn(),
    })
  })

  it('1. Redireciona para /account/password no login bem-sucedido com must_change_password=true', async () => {
    mockLogin.mockResolvedValueOnce({
      success: true,
      must_change_password: true,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/account/password"
            element={<div data-testid="pagina-troca-senha">Tela de Troca Obrigatória</div>}
          />
          <Route
            path="/dashboard"
            element={<div data-testid="pagina-dashboard">Painel Principal</div>}
          />
        </Routes>
      </MemoryRouter>,
    )

    const emailInput = screen.getByLabelText(/E-mail institucional/i)
    const passInput = screen.getByLabelText(/Senha de acesso/i)
    const submitBtn = screen.getByRole('button', { name: /Entrar no Painel/i })

    fireEvent.change(emailInput, { target: { value: 'admin@construindomeufuturo.com' } })
    fireEvent.change(passInput, { target: { value: 'TempPass@123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('pagina-troca-senha')).not.toBeNull()
      expect(screen.queryByTestId('pagina-dashboard')).toBeNull()
    })
  })

  it('2. Redireciona para /dashboard no login normal quando must_change_password=false', async () => {
    mockLogin.mockResolvedValueOnce({
      success: true,
      must_change_password: false,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/account/password"
            element={<div data-testid="pagina-troca-senha">Tela de Troca Obrigatória</div>}
          />
          <Route
            path="/dashboard"
            element={<div data-testid="pagina-dashboard">Painel Principal</div>}
          />
        </Routes>
      </MemoryRouter>,
    )

    const emailInput = screen.getByLabelText(/E-mail institucional/i)
    const passInput = screen.getByLabelText(/Senha de acesso/i)
    const submitBtn = screen.getByRole('button', { name: /Entrar no Painel/i })

    fireEvent.change(emailInput, { target: { value: 'usuario@construindomeufuturo.com' } })
    fireEvent.change(passInput, { target: { value: 'SenhaForte@123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('pagina-dashboard')).not.toBeNull()
      expect(screen.queryByTestId('pagina-troca-senha')).toBeNull()
    })
  })
})
