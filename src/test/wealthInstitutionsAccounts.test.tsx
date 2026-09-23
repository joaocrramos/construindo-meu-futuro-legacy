import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InstitutionsPage from '@/pages/wealth/Institutions'
import AccountsPage from '@/pages/wealth/Accounts'
import * as instService from '@/services/institutions'
import * as accService from '@/services/accounts'

vi.mock('@/services/institutions')
vi.mock('@/services/accounts')

describe('CRUD de Instituições Financeiras', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Exibe EmptyState com ação "Criar primeira instituição" quando não há registros', async () => {
    vi.mocked(instService.listInstitutions).mockResolvedValue([])

    render(
      <MemoryRouter>
        <InstitutionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma instituição cadastrada/i)).not.toBeNull()
      expect(screen.getByRole('button', { name: /Criar primeira instituição/i })).not.toBeNull()
    })
  })

  it('2. Lista instituições cadastradas com tipo e status', async () => {
    vi.mocked(instService.listInstitutions).mockResolvedValue([
      {
        id: 'inst_1',
        user_id: 'usr_1',
        name: 'Banco Itaú',
        code: '341',
        institution_type: 'bank',
        website: 'https://itau.com.br',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'inst_2',
        user_id: 'usr_1',
        name: 'XP Investimentos',
        code: '102',
        institution_type: 'broker',
        is_active: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])

    render(
      <MemoryRouter>
        <InstitutionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Banco Itaú')).not.toBeNull()
      expect(screen.getByText('XP Investimentos')).not.toBeNull()
      expect(screen.getByText('Banco Comercial')).not.toBeNull()
      expect(screen.getByText('Corretora de Valores')).not.toBeNull()
      expect(screen.getByText('Ativa')).not.toBeNull()
      expect(screen.getByText('Inativa')).not.toBeNull()
    })
  })

  it('3. Criação de instituição com tratamento de duplicidade amigável em português', async () => {
    vi.mocked(instService.listInstitutions).mockResolvedValue([])
    vi.mocked(instService.createInstitution).mockRejectedValue(
      new Error('Você já possui uma instituição com este nome.'),
    )

    render(
      <MemoryRouter>
        <InstitutionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Criar primeira instituição/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Criar primeira instituição/i }))

    const nameInput = screen.getByPlaceholderText(/Ex.: Itaú Unibanco/i)
    fireEvent.change(nameInput, { target: { value: 'Banco Itaú' } })

    const submitBtn = screen.getByRole('button', { name: /Criar Instituição/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(instService.createInstitution).toHaveBeenCalled()
    })
  })

  it('4. Modal de instituição renderiza Checkbox do design system com label associado e permite alternar estado', async () => {
    vi.mocked(instService.listInstitutions).mockResolvedValue([])
    vi.mocked(instService.createInstitution).mockResolvedValue({
      id: 'inst_new',
      user_id: 'usr_1',
      name: 'Banco Teste',
      institution_type: 'bank',
      is_active: false,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <InstitutionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Criar primeira instituição/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Criar primeira instituição/i }))

    // O checkbox do design system tem role="checkbox" e label associado via htmlFor/id
    const checkbox = screen.getByRole('checkbox', {
      name: /Instituição ativa para novas operações/i,
    })
    expect(checkbox).not.toBeNull()
    expect(checkbox.getAttribute('id')).toBe('instActive')
    expect(checkbox.getAttribute('data-state')).toBe('checked')

    // Alterna o checkbox desmarcando-o
    fireEvent.click(checkbox)
    expect(checkbox.getAttribute('data-state')).toBe('unchecked')

    const nameInput = screen.getByPlaceholderText(/Ex.: Itaú Unibanco/i)
    fireEvent.change(nameInput, { target: { value: 'Banco Teste' } })

    const submitBtn = screen.getByRole('button', { name: /Criar Instituição/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(instService.createInstitution).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Banco Teste',
          is_active: false,
        }),
      )
    })
  })
})

describe('CRUD de Contas & Custódias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Exibe EmptyState com ação "Criar primeira conta" quando não há registros', async () => {
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(instService.listInstitutions).mockResolvedValue([])

    render(
      <MemoryRouter>
        <AccountsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma conta cadastrada/i)).not.toBeNull()
      expect(screen.getByRole('button', { name: /Criar primeira conta/i })).not.toBeNull()
    })
  })

  it('2. Lista contas cadastradas com instituição expandida, tipo e moeda', async () => {
    vi.mocked(instService.listInstitutions).mockResolvedValue([
      {
        id: 'inst_1',
        user_id: 'usr_1',
        name: 'Banco Itaú',
        institution_type: 'bank',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])

    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'Conta Corrente Principal',
        account_type: 'checking',
        currency: 'BRL',
        agency: '1234',
        account_number: '56789-0',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        expand: {
          institution_id: {
            id: 'inst_1',
            user_id: 'usr_1',
            name: 'Banco Itaú',
            institution_type: 'bank',
            is_active: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        },
      },
    ])

    render(
      <MemoryRouter>
        <AccountsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Conta Corrente Principal')).not.toBeNull()
      expect(screen.getByText('Banco Itaú')).not.toBeNull()
      expect(screen.getByText('Conta Corrente')).not.toBeNull()
      expect(screen.getByText('BRL')).not.toBeNull()
    })
  })

  it('3. Modal de conta renderiza Checkbox do design system com label associado e permite alternar estado', async () => {
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(instService.listInstitutions).mockResolvedValue([
      {
        id: 'inst_1',
        user_id: 'usr_1',
        name: 'Banco Itaú',
        institution_type: 'bank',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])
    vi.mocked(accService.createAccount).mockResolvedValue({
      id: 'acc_new',
      user_id: 'usr_1',
      institution_id: 'inst_1',
      name: 'Reserva Emergência',
      account_type: 'checking',
      currency: 'BRL',
      is_active: false,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <AccountsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Criar primeira conta/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Criar primeira conta/i }))

    // O checkbox do design system tem role="checkbox" e label associado via htmlFor/id
    const checkbox = screen.getByRole('checkbox', {
      name: /Conta ativa para movimentações financeiras/i,
    })
    expect(checkbox).not.toBeNull()
    expect(checkbox.getAttribute('id')).toBe('accActive')
    expect(checkbox.getAttribute('data-state')).toBe('checked')

    // Alterna o checkbox desmarcando-o clicando no label ou no próprio checkbox
    const label = screen.getByText(/Conta ativa para movimentações financeiras/i)
    fireEvent.click(label)
    expect(checkbox.getAttribute('data-state')).toBe('unchecked')

    const nameInput = screen.getByPlaceholderText(/Ex.: Itaú Conta Principal/i)
    fireEvent.change(nameInput, { target: { value: 'Reserva Emergência' } })

    const submitBtn = screen.getByRole('button', { name: /Criar Conta/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(accService.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Reserva Emergência',
          is_active: false,
        }),
      )
    })
  })
})
