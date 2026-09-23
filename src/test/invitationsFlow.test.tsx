import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminInvitesPage from '@/pages/admin/Invites'
import RegisterPage from '@/pages/public/Register'
import * as invitesService from '@/services/invitations'

vi.mock('@/services/invitations')

describe('Fluxo de Convites (Invite-Only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. AdminInvitesPage lista os convites retornados pela collection invitations', async () => {
    vi.mocked(invitesService.listInvitations).mockResolvedValue([
      {
        id: 'inv_1',
        email: 'convidado1@teste.com',
        role: 'user',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'inv_2',
        email: 'convidado2@teste.com',
        role: 'admin',
        status: 'accepted',
        expires_at: new Date().toISOString(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])

    render(
      <MemoryRouter>
        <AdminInvitesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Carregando convites.../i)).not.toBeNull()

    await waitFor(() => {
      expect(screen.getByText('convidado1@teste.com')).not.toBeNull()
      expect(screen.getByText('convidado2@teste.com')).not.toBeNull()
      expect(screen.getByText('Pendente')).not.toBeNull()
      expect(screen.getByText('Aceito')).not.toBeNull()
    })
  })

  it('2. AdminInvitesPage permite gerar novo convite e exibe o link gerado', async () => {
    vi.mocked(invitesService.listInvitations).mockResolvedValue([])
    vi.mocked(invitesService.createInvitation).mockResolvedValue({
      id: 'inv_new',
      email: 'novo@teste.com',
      role: 'user',
      status: 'pending',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created: new Date().toISOString(),
      token: 'tokpub123.secret456',
    })

    render(
      <MemoryRouter>
        <AdminInvitesPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Nenhum convite pendente ou ativo emitido/i)).not.toBeNull()
    })

    // Clicar em Gerar Novo Convite
    const createBtn = screen.getByRole('button', { name: /Gerar Novo Convite/i })
    fireEvent.click(createBtn)

    // Preencher formulário modal
    const emailInput = screen.getByPlaceholderText(/convidado@exemplo.com/i)
    fireEvent.change(emailInput, { target: { value: 'novo@teste.com' } })

    const submitBtn = screen.getByRole('button', { name: /Emitir Convite Seguro/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(invitesService.createInvitation).toHaveBeenCalledWith('novo@teste.com', 'user')
      expect(screen.getByText(/Convite Criado com Sucesso/i)).not.toBeNull()
    })
  })

  it('3. RegisterPage valida token válido e preenche e-mail em modo somente leitura', async () => {
    vi.mocked(invitesService.validateInvitation).mockResolvedValue({
      valid: true,
      email: 'autorizado@empresa.com',
      role: 'user',
    })

    render(
      <MemoryRouter initialEntries={['/register?token=tok123.secret456']}>
        <RegisterPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Convite Validado com Sucesso!/i)).not.toBeNull()
      const emailField = screen.getByDisplayValue('autorizado@empresa.com') as HTMLInputElement
      expect(emailField.disabled).toBe(true)
    })
  })
})
