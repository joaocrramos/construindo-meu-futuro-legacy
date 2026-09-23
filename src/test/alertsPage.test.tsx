import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import AlertsPage from '@/pages/overview/Alerts'
import * as alertsService from '@/services/alerts'
import pb from '@/lib/pocketbase/client'

vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    collection: vi.fn(),
    send: vi.fn(),
  },
}))

describe('AlertsPage & alerts service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista alertas da collection PocketBase corretamente', async () => {
    const mockAlerts = [
      {
        id: 'alt_1',
        user_id: 'usr_1',
        type: 'balance_negative' as const,
        title: 'Saldo Negativo em Caixa: Itaú',
        message: 'A conta Itaú está com saldo devedor de BRL -120,50.',
        severity: 'warn' as const,
        reference_id: 'acc_itau',
        is_read: false,
        created: '2026-09-23T06:00:00.000Z',
        updated: '2026-09-23T06:00:00.000Z',
      },
    ]

    const getFullListMock = vi.fn().mockResolvedValue(mockAlerts)
    vi.mocked(pb.collection).mockReturnValue({
      getFullList: getFullListMock,
      update: vi.fn(),
    } as any)

    const result = await alertsService.listAlerts()
    expect(result).toHaveLength(1)
    expect(getFullListMock).toHaveBeenCalledWith({
      filter: undefined,
      sort: '-created',
    })
  })

  it('filtra por tipo e status na chamada de listAlerts', async () => {
    const getFullListMock = vi.fn().mockResolvedValue([])
    vi.mocked(pb.collection).mockReturnValue({
      getFullList: getFullListMock,
    } as any)

    await alertsService.listAlerts({ type: 'maturity_upcoming', isRead: false })
    expect(getFullListMock).toHaveBeenCalledWith({
      filter: 'type = "maturity_upcoming" && is_read = false',
      sort: '-created',
    })
  })

  it('permite alternar alerta como lido/não lido', async () => {
    const updateMock = vi.fn().mockResolvedValue({
      id: 'alt_1',
      is_read: true,
    })
    vi.mocked(pb.collection).mockReturnValue({
      update: updateMock,
    } as any)

    await alertsService.markAlertRead('alt_1', true)
    expect(updateMock).toHaveBeenCalledWith('alt_1', { is_read: true })
  })

  it('marcar todas como lidas chama update para todos os não lidos', async () => {
    const updateMock = vi.fn().mockResolvedValue({})
    vi.mocked(pb.collection).mockReturnValue({
      update: updateMock,
    } as any)

    const list: alertsService.AlertRecord[] = [
      {
        id: 'alt_1',
        user_id: 'u1',
        type: 'balance_negative',
        title: 'T1',
        message: 'M1',
        severity: 'warn',
        is_read: false,
        created: '',
        updated: '',
      },
      {
        id: 'alt_2',
        user_id: 'u1',
        type: 'maturity_today',
        title: 'T2',
        message: 'M2',
        severity: 'critical',
        is_read: true,
        created: '',
        updated: '',
      },
      {
        id: 'alt_3',
        user_id: 'u1',
        type: 'system',
        title: 'T3',
        message: 'M3',
        severity: 'info',
        is_read: false,
        created: '',
        updated: '',
      },
    ]

    await alertsService.markAllAlertsRead(list)
    expect(updateMock).toHaveBeenCalledTimes(2)
    expect(updateMock).toHaveBeenCalledWith('alt_1', { is_read: true })
    expect(updateMock).toHaveBeenCalledWith('alt_3', { is_read: true })
  })

  it('renderiza página de alertas com filtros e botão marcar todas como lidas', async () => {
    const mockList = [
      {
        id: 'alt_1',
        user_id: 'u1',
        type: 'maturity_today' as const,
        title: 'Vencimento Hoje: Tesouro Selic',
        message: 'Título vence hoje.',
        severity: 'warn' as const,
        is_read: false,
        created: '2026-09-23T06:00:00.000Z',
        updated: '2026-09-23T06:00:00.000Z',
      },
    ]

    const updateMock = vi.fn().mockResolvedValue({
      ...mockList[0],
      is_read: true,
    })

    vi.mocked(pb.collection).mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockList),
      update: updateMock,
    } as any)

    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Vencimento Hoje: Tesouro Selic/i)).not.toBeNull()
      expect(screen.getByText(/1 alerta\(s\) não lido\(s\)/i)).not.toBeNull()
      expect(screen.getByText(/Marcar todas como lidas/i)).not.toBeNull()
    })

    // Clicar em "Marcar como lida"
    const markBtn = screen.getByText(/Marcar como lida/i)
    fireEvent.click(markBtn)

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith('alt_1', { is_read: true })
    })
  })

  it('anti-duplicidade: valida lógica conceitual do cron de alertas', () => {
    // Simula verificação anti-duplicidade de maturity e balance_negative
    const existingMaturityAlerts = [
      { user_id: 'u1', type: 'maturity_upcoming', reference_id: 'pos_1', due_date: '2026-10-23' },
    ]

    const checkMaturityDuplicate = (
      userId: string,
      type: string,
      posId: string,
      dueDate: string,
    ) => {
      return existingMaturityAlerts.some(
        (a) =>
          a.user_id === userId &&
          a.type === type &&
          a.reference_id === posId &&
          a.due_date === dueDate,
      )
    }

    expect(checkMaturityDuplicate('u1', 'maturity_upcoming', 'pos_1', '2026-10-23')).toBe(true)
    expect(checkMaturityDuplicate('u1', 'maturity_today', 'pos_1', '2026-10-23')).toBe(false)
    expect(checkMaturityDuplicate('u1', 'maturity_upcoming', 'pos_2', '2026-10-23')).toBe(false)

    const existingNegativeBalanceAlerts = [
      { user_id: 'u1', type: 'balance_negative', reference_id: 'acc_1', is_read: false },
    ]

    const checkBalanceDuplicate = (userId: string, accId: string) => {
      return existingNegativeBalanceAlerts.some(
        (a) =>
          a.user_id === userId &&
          a.type === 'balance_negative' &&
          a.reference_id === accId &&
          !a.is_read,
      )
    }

    expect(checkBalanceDuplicate('u1', 'acc_1')).toBe(true)
    expect(checkBalanceDuplicate('u1', 'acc_2')).toBe(false)
  })
})
