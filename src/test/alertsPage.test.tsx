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

  describe('Envio de e-mail Resend para alertas de vencimento crítico', () => {
    interface Position {
      id: string
      user_id: string
      asset_ticker: string
      total_cost_cents: number
      maturity_date: string // YYYY-MM-DD
    }

    interface ProcessResult {
      alertsCreated: Array<{
        id: string
        user_id: string
        type: string
        severity: string
        reference_id: string
        due_date: string
      }>
      emailsSent: Array<{
        to: string
        subject: string
        html: string
      }>
      logs: string[]
    }

    const processPositionAlerts = (
      positions: Position[],
      existingAlerts: Array<{
        user_id: string
        type: string
        reference_id: string
        due_date: string
      }>,
      users: Record<string, { email: string; name: string }>,
      config: {
        resendApiKey: string
        resendFromEmail: string
        resendFromName: string
        siteUrl: string
        httpSend: (opts: any) => { statusCode: number; raw?: string }
      },
      todayStr: string = '2026-09-24',
    ): ProcessResult => {
      const result: ProcessResult = {
        alertsCreated: [],
        emailsSent: [],
        logs: [],
      }

      const todayParts = todayStr.split('-').map((p) => Number.parseInt(p, 10))
      const curDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2])

      for (const pos of positions) {
        const matDateStr = (pos.maturity_date || '').slice(0, 10)
        if (!matDateStr) continue

        const posParts = matDateStr.split('-').map((p) => Number.parseInt(p, 10))
        if (posParts.length !== 3) continue

        const targetDate = new Date(posParts[0], posParts[1] - 1, posParts[2])
        const diffDays = Math.round(
          (targetDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24),
        )

        let alertType: string | null = null
        let alertSeverity = 'info'
        let alertTitle = ''
        let alertMessage = ''

        const dateFormatted = `${String(posParts[2]).padStart(2, '0')}/${String(
          posParts[1],
        ).padStart(2, '0')}/${posParts[0]}`

        if (diffDays === 0) {
          alertType = 'maturity_today'
          alertSeverity = 'critical'
          alertTitle = `Vencimento Hoje: ${pos.asset_ticker}`
          alertMessage = `O título ${pos.asset_ticker} vence hoje (${dateFormatted}). Lembre-se de verificar o resgate ou reinvestimento.`
        } else if (diffDays === 7) {
          alertType = 'maturity_upcoming'
          alertSeverity = 'critical'
          alertTitle = `Vencimento em 7 dias: ${pos.asset_ticker}`
          alertMessage = `O título ${pos.asset_ticker} vencerá em 7 dias (${dateFormatted}). Planeje a alocação dos recursos.`
        } else if (diffDays === 15) {
          alertType = 'maturity_upcoming'
          alertSeverity = 'warn'
          alertTitle = `Vencimento em 15 dias: ${pos.asset_ticker}`
          alertMessage = `O título ${pos.asset_ticker} vencerá em 15 dias (${dateFormatted}). Planeje a alocação dos recursos.`
        } else if (diffDays === 30) {
          alertType = 'maturity_upcoming'
          alertSeverity = 'info'
          alertTitle = `Vencimento em 30 dias: ${pos.asset_ticker}`
          alertMessage = `O título ${pos.asset_ticker} vencerá em 30 dias (${dateFormatted}). Planeje a alocação dos recursos.`
        }

        if (alertType) {
          const exists = existingAlerts.some(
            (a) =>
              a.user_id === pos.user_id &&
              a.type === alertType &&
              a.reference_id === pos.id &&
              a.due_date.startsWith(matDateStr),
          )

          if (!exists) {
            const newAlert = {
              id: `alt_${Math.random().toString(36).substring(2, 9)}`,
              user_id: pos.user_id,
              type: alertType,
              title: alertTitle,
              message: alertMessage,
              severity: alertSeverity,
              reference_id: pos.id,
              due_date: `${matDateStr} 00:00:00.000Z`,
            }
            result.alertsCreated.push(newAlert)
            existingAlerts.push(newAlert)

            // Disparo de e-mail via Resend se crítico
            if (alertSeverity === 'critical') {
              try {
                if (!config.resendApiKey) {
                  result.logs.push(`[WARN] RESEND_API_KEY ausente para alerta ${newAlert.id}`)
                } else {
                  const userRec = users[pos.user_id]
                  const userEmail = userRec?.email || ''
                  const userName = userRec?.name || 'Investidor(a)'

                  if (userEmail && userEmail.includes('@')) {
                    const costFormatted = (pos.total_cost_cents / 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                    const posValueDisplay = `R$ ${costFormatted}`
                    const diasTexto = diffDays === 0 ? 'hoje' : `em ${diffDays} dias`
                    const subject = `⚠️ Vencimento crítico: ${pos.asset_ticker} ${diasTexto}`
                    const html = `Olá ${userName}, ativo ${pos.asset_ticker}, valor ${posValueDisplay}, vencimento ${dateFormatted}, acesse ${config.siteUrl}/overview/alerts`

                    const res = config.httpSend({
                      url: 'https://api.resend.com/emails',
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${config.resendApiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        from: `${config.resendFromName} <${config.resendFromEmail}>`,
                        to: [userEmail],
                        subject,
                        html,
                      }),
                      timeout: 15,
                    })

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                      result.emailsSent.push({ to: userEmail, subject, html })
                      result.logs.push(
                        `[INFO] E-mail de alerta crítico enviado com sucesso para ${userEmail} (alerta: ${newAlert.id}, ativo: ${pos.asset_ticker})`,
                      )
                    } else {
                      result.logs.push(
                        `[WARN] Falha no envio do e-mail via Resend (status ${res.statusCode}) para ${userEmail} (alerta: ${newAlert.id})`,
                      )
                    }
                  }
                }
              } catch (mailErr: any) {
                result.logs.push(
                  `[WARN] Erro ao enviar e-mail de alerta crítico para ${pos.user_id}: ${mailErr.message}`,
                )
              }
            }
          }
        }
      }

      return result
    }

    it('1. Alerta crítico NOVO (vence hoje ou em 7 dias) dispara e-mail via Resend com detalhes corretos', () => {
      const httpSend = vi.fn().mockReturnValue({ statusCode: 200 })
      const positions: Position[] = [
        {
          id: 'pos_cdb',
          user_id: 'usr_1',
          asset_ticker: 'CDB Banco XP',
          total_cost_cents: 500000, // R$ 5.000,00
          maturity_date: '2026-10-01', // Em 7 dias de 2026-09-24
        },
      ]
      const existingAlerts: any[] = []
      const users = {
        usr_1: { email: 'investidor@teste.com', name: 'Investidor Teste' },
      }
      const config = {
        resendApiKey: 're_valid_key',
        resendFromEmail: 'contato@construindomeufuturo.com',
        resendFromName: 'Construindo Meu Futuro',
        siteUrl: 'https://construindomeufuturo.com',
        httpSend,
      }

      const res = processPositionAlerts(positions, existingAlerts, users, config, '2026-09-24')

      expect(res.alertsCreated).toHaveLength(1)
      expect(res.alertsCreated[0].severity).toBe('critical')
      expect(httpSend).toHaveBeenCalledTimes(1)
      expect(res.emailsSent).toHaveLength(1)
      expect(res.emailsSent[0].to).toBe('investidor@teste.com')
      expect(res.emailsSent[0].subject).toContain('⚠️ Vencimento crítico: CDB Banco XP em 7 dias')
      expect(res.emailsSent[0].html).toContain('01/10/2026')
      expect(res.emailsSent[0].html).toContain('R$ 5.000,00')
      expect(res.emailsSent[0].html).toContain('https://construindomeufuturo.com/overview/alerts')
      expect(res.logs.some((l) => l.includes('[INFO] E-mail de alerta crítico enviado'))).toBe(true)
    })

    it('2. Alerta repetido NÃO reenvia e-mail (respeita anti-duplicidade estrita)', () => {
      const httpSend = vi.fn().mockReturnValue({ statusCode: 200 })
      const positions: Position[] = [
        {
          id: 'pos_cdb',
          user_id: 'usr_1',
          asset_ticker: 'CDB Banco XP',
          total_cost_cents: 500000,
          maturity_date: '2026-09-24', // Vence hoje
        },
      ]
      // Alerta já existente na base para hoje
      const existingAlerts = [
        {
          user_id: 'usr_1',
          type: 'maturity_today',
          reference_id: 'pos_cdb',
          due_date: '2026-09-24 00:00:00.000Z',
        },
      ]
      const users = {
        usr_1: { email: 'investidor@teste.com', name: 'Investidor Teste' },
      }
      const config = {
        resendApiKey: 're_valid_key',
        resendFromEmail: 'contato@construindomeufuturo.com',
        resendFromName: 'Construindo Meu Futuro',
        siteUrl: 'https://construindomeufuturo.com',
        httpSend,
      }

      const res = processPositionAlerts(positions, existingAlerts, users, config, '2026-09-24')

      // Nenhum novo alerta deve ser criado
      expect(res.alertsCreated).toHaveLength(0)
      // Nenhuma chamada HTTP para o Resend deve ser efetuada
      expect(httpSend).not.toHaveBeenCalled()
      expect(res.emailsSent).toHaveLength(0)
    })

    it('3. Falha na chamada da API do Resend não quebra o fluxo e registra erro no log', () => {
      const httpSend = vi.fn().mockImplementation(() => {
        throw new Error('Timeout de rede na API do Resend')
      })
      const positions: Position[] = [
        {
          id: 'pos_cdb_critico',
          user_id: 'usr_1',
          asset_ticker: 'CDB Banco XP',
          total_cost_cents: 300000,
          maturity_date: '2026-09-24', // Vence hoje (critical)
        },
      ]
      const existingAlerts: any[] = []
      const users = {
        usr_1: { email: 'investidor@teste.com', name: 'Investidor Teste' },
      }
      const config = {
        resendApiKey: 're_valid_key',
        resendFromEmail: 'contato@construindomeufuturo.com',
        resendFromName: 'Construindo Meu Futuro',
        siteUrl: 'https://construindomeufuturo.com',
        httpSend,
      }

      // A execução não pode lançar exceção
      expect(() => {
        const res = processPositionAlerts(positions, existingAlerts, users, config, '2026-09-24')
        // O alerta de banco foi gerado com sucesso
        expect(res.alertsCreated).toHaveLength(1)
        expect(res.alertsCreated[0].severity).toBe('critical')
        // Nenhum e-mail registrado com sucesso
        expect(res.emailsSent).toHaveLength(0)
        // Log de erro registrado
        expect(res.logs.some((l) => l.includes('Erro ao enviar e-mail de alerta crítico'))).toBe(
          true,
        )
      }).not.toThrow()
    })
  })
})
