import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1', name: 'João Carlos', email: 'joao@example.com' },
    isAdmin: false,
    logout: vi.fn(),
  })),
}))

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
  })),
}))

describe('AppLayout - Submenu Cadastros', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('permite expandir e contrair o submenu Cadastros via clique no botão', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppLayout>
          <div>Conteúdo Principal</div>
        </AppLayout>
      </MemoryRouter>,
    )

    // Inicialmente em /dashboard o submenu está fechado
    expect(screen.queryByRole('link', { name: /Instituições/i })).toBeNull()

    // Encontra os botões com aria-label "Cadastros submenu" (desktop e mobile)
    const toggleButtons = screen.getAllByRole('button', { name: /Cadastros submenu/i })
    expect(toggleButtons.length).toBeGreaterThan(0)
    expect(toggleButtons[0].getAttribute('aria-expanded')).toBe('false')

    // Clica para expandir
    fireEvent.click(toggleButtons[0])
    expect(toggleButtons[0].getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('link', { name: /Instituições/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Contas/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Carteiras/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Metas/i }).length).toBeGreaterThan(0)
    expect(sessionStorage.getItem('cmf_nav_cadastros_open')).toBe('true')

    // Clica para contrair
    fireEvent.click(toggleButtons[0])
    expect(toggleButtons[0].getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('link', { name: /Instituições/i })).toBeNull()
    expect(sessionStorage.getItem('cmf_nav_cadastros_open')).toBe('false')
  })

  it('abre automaticamente quando a rota atual é uma das rotas filhas (/wealth/institutions)', () => {
    render(
      <MemoryRouter initialEntries={['/wealth/institutions']}>
        <AppLayout>
          <div>Página de Instituições</div>
        </AppLayout>
      </MemoryRouter>,
    )

    const toggleButtons = screen.getAllByRole('button', { name: /Cadastros submenu/i })
    expect(toggleButtons[0].getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('link', { name: /Instituições/i }).length).toBeGreaterThan(0)
  })

  it('recupera o estado aberto salvo previamente em sessionStorage', () => {
    sessionStorage.setItem('cmf_nav_cadastros_open', 'true')

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppLayout>
          <div>Dashboard</div>
        </AppLayout>
      </MemoryRouter>,
    )

    const toggleButtons = screen.getAllByRole('button', { name: /Cadastros submenu/i })
    expect(toggleButtons[0].getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('link', { name: /Instituições/i }).length).toBeGreaterThan(0)
  })
})
