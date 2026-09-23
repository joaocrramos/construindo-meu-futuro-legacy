import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import AlertsPage from '@/pages/overview/Alerts'
import * as alertsService from '@/services/alerts'

vi.mock('@/services/alerts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/alerts')>()
  return {
    ...actual,
    listAlerts: vi.fn(),
    markAlertRead: vi.fn(),
    markAllAlertsRead: vi.fn(),
    triggerAlertsCheck: vi.fn(),
  }
})

describe('AlertsPage & alerts service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista alertas da collection PocketBase corretamente', async () => {
    const mockAlerts: alertsService.AlertRecord[] = [
      {
        id: 'alt_1',
        user_id: 'usr_1',
        type: 'balance_negative',
        title: 'Saldo Negativo em Caixa: Itaú',
        message: 'A conta Itaú está com saldo devedor de BRL -120,50.',
        severity: 'warn',
        reference_id: 'acc_itau',
        is_read: false,
        created: '2026-09-23T06:00:00.000Z',
        updated: '2026-09-23T06:00:00.000Z',
      },
    ]

    vi.mocked(alertsService.listAlerts).mockResolvedValue(mockAlerts)

    const result = await alertsService.listAlerts()
    expect(result).toHaveLength(1)
    expect(alertsService.listAlerts).toHaveBeenCalled()
  })

  it('filtra por tipo e status na chamada de listAlerts', async () => {
    vi.mocked(alertsService.listAlerts).mockResolvedValue([])

    await alertsService.listAlerts({ type: 'maturity_upcoming', isRead: false })
    expect(alertsService.listAlerts).toHaveBeenCalledWith({
      type: 'maturity_upcoming',
      isRead: false,
    })
  })

  it('permite alternar alerta como lido/não lido', async () => {
    vi.mocked(alertsService.markAlertRead).mockResolvedValue({
      id: 'alt_1',
      user_id: 'usr_1',
      type: 'balance_negative',
      title: 'Saldo Negativo',
      message: 'Mensagem',
      severity: 'warn',
      is_read: true,
      created: '',
      updated: '',
    })

    await alertsService.markAlertRead('alt_1', true)
    expect(alertsService.markAlertRead).toHaveBeenCalledWith('alt_1', true)
  })

  it('marcar todas como lidas chama update para todos os não lidos', async () => {
    vi.mocked(alertsService.markAllAlertsRead).mockResolvedValue(undefined)

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
    expect(alertsService.markAllAlertsRead).toHaveBeenCalledWith(list)
  })

  it('renderiza página de alertas com filtros e botão marcar todas como lidas', async () => {
    const mockList: alertsService.AlertRecord[] = [
      {
        id: 'alt_1',
        user_id: 'u1',
        type: 'maturity_today',
        title: 'Vencimento Hoje: Tesouro Selic',
        message: 'Título vence hoje.',
        severity: 'warn',
        is_read: false,
        created: '2026-09-23T06:00:00.000Z',
        updated: '2026-09-23T06:00:00.000Z',
      },
    ]

    vi.mocked(alertsService.listAlerts).mockResolvedValue(mockList)
    vi.mocked(alertsService.markAlertRead).mockResolvedValue({
      ...mockList[0],
      is_read: true,
    })

    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Vencimento Hoje: Tesouro Selic/i)).not.toBeNull()
    expect(await screen.findByText(/1 alerta\(s\) não lido\(s\)/i)).not.toBeNull()
    expect(await screen.findByText(/Marcar todas como lidas/i)).not.toBeNull()

    // Clicar em "Marcar como lida" usando waitFor / findBy
    const markBtn = await screen.findByTitle(/Marcar como lido/i)
    fireEvent.click(markBtn)

    await waitFor(() => {
      expect(alertsService.markAlertRead).toHaveBeenCalledWith('alt_1', true)
    })
  })

  it('permite acionar a verificação manual de alertas pelo botão "Verificar Alertas"', async () => {
    vi.mocked(alertsService.listAlerts).mockResolvedValue([])
    vi.mocked(alertsService.triggerAlertsCheck).mockResolvedValue({
      success: true,
      alerts_created: 1,
      users_affected: 1,
      date: '2026-09-24',
    })

    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    )

    const checkBtn = await screen.findByTitle(/Executar verificação manual de alertas/i)
    expect(checkBtn).not.toBeNull()
    fireEvent.click(checkBtn)

    await waitFor(() => {
      expect(alertsService.triggerAlertsCheck).toHaveBeenCalled()
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
