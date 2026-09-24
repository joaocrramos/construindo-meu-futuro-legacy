import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminResetDevPage from '@/pages/admin/ResetDev'
import * as adminResetService from '@/services/adminReset'

const getList = vi.fn()
const create = vi.fn()

vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    authStore: {
      token: 'fake-token',
      record: { id: 'admin-id', role: 'admin', email: 'admin@example.com' },
      isValid: true,
    },
    collection: () => ({ getList, create }),
  },
}))

vi.mock('@/services/adminReset', () => ({
  resetBusinessData: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const PHRASE = 'LIMPAR AMBIENTE DESENVOLVIMENTO'

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminResetDevPage />
    </MemoryRouter>,
  )

const openModalAndConfirm = async (phrase: string) => {
  fireEvent.click(await screen.findByRole('button', { name: /Executar Nova Limpeza/i }))
  fireEvent.change(await screen.findByLabelText(/Para confirmar, digite exatamente/i), {
    target: { value: phrase },
  })
}

describe('Limpeza da base (/admin/reset-dev)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getList.mockResolvedValue({ items: [], totalItems: 0 })
  })

  it('chama a rota de backend com a frase digitada e informa o total removido', async () => {
    vi.mocked(adminResetService.resetBusinessData).mockResolvedValue({
      success: true,
      deleted_counts: { movements: 3, accounts: 2 },
    })
    const { toast } = await import('sonner')

    renderPage()
    await openModalAndConfirm(PHRASE)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Executar Limpeza' }))

    await waitFor(() => {
      expect(adminResetService.resetBusinessData).toHaveBeenCalledWith(PHRASE)
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Limpeza concluída',
        expect.objectContaining({ description: expect.stringContaining('5 registros removidos') }),
      )
    })
    // A tela não grava mais um registro de auditoria próprio: quem registra é o backend
    expect(create).not.toHaveBeenCalled()
  })

  it('mostra a mensagem do backend quando a limpeza está desabilitada no ambiente', async () => {
    vi.mocked(adminResetService.resetBusinessData).mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        response: { message: 'A limpeza da base está desabilitada neste ambiente.' },
      }),
    )
    const { toast } = await import('sonner')

    renderPage()
    await openModalAndConfirm(PHRASE)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Executar Limpeza' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro na operação', {
        description: 'A limpeza da base está desabilitada neste ambiente.',
      })
    })
  })
})
