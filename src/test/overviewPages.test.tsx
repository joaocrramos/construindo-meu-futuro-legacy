import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '@/pages/overview/Dashboard'
import SummaryPage from '@/pages/overview/Summary'
import EvolutionPage from '@/pages/overview/Evolution'
import DistributionPage from '@/pages/overview/Distribution'
import ActivitiesPage from '@/pages/overview/Activities'
import DueDatesOverviewPage from '@/pages/overview/DueDates'
import GoalsOverviewPage from '@/pages/overview/Goals'
import AlertsPage from '@/pages/overview/Alerts'

import * as accBalService from '@/services/accountBalances'
import * as posService from '@/services/positions'
import * as movService from '@/services/movements'
import * as accService from '@/services/accounts'
import * as assetService from '@/services/assets'
import * as portService from '@/services/portfolios'
import * as alertsService from '@/services/alerts'

vi.mock('@/services/accountBalances')
vi.mock('@/services/positions')
vi.mock('@/services/movements')
vi.mock('@/services/accounts')
vi.mock('@/services/assets')
vi.mock('@/services/portfolios')
vi.mock('@/services/alerts')

// Mock do ResizeObserver e componentes de chart para ambiente JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Telas de Overview conectadas a dados reais', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(movService.formatQuantityE8).mockImplementation((e8) =>
      e8 ? String(e8 / 100000000) : '0',
    )
  })

  describe('1. Dashboard (/dashboard)', () => {
    it('renderiza EmptyState amigável quando não há dados', async () => {
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([])
      vi.mocked(posService.listPositions).mockResolvedValue([])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(
          screen.getByText(/Seu patrimônio ainda não possui registros cadastrados/i),
        ).not.toBeNull()
        expect(
          screen.getByRole('link', { name: /Registrar Primeira Movimentação/i }),
        ).not.toBeNull()
      })
    })

    it('renderiza KPIs consolidados, maiores posições e movimentações recentes com dados reais', async () => {
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([
        {
          id: 'bal_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          currency: 'BRL',
          balance_cents: 2500000, // R$ 25.000,00
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(posService.listPositions).mockResolvedValue([
        {
          id: 'pos_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          asset_id: 'ast_1',
          quantity_e8: 10000000000, // 100 cotas
          average_price_cents: 3500, // R$ 35,00
          total_cost_cents: 350000, // R$ 3.500,00
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          expand: {
            account_id: {
              id: 'acc_1',
              user_id: 'usr_1',
              institution_id: 'inst_1',
              name: 'XP Investimentos',
              account_type: 'investment',
              currency: 'BRL',
              is_active: true,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
            asset_id: {
              id: 'ast_1',
              user_id: 'usr_1',
              ticker: 'PETR4',
              name: 'Petrobras PN',
              asset_class: 'equities',
              currency: 'BRL',
              is_active: true,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        },
      ])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([
        {
          id: 'mov_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          asset_id: 'ast_1',
          movement_type: 'buy',
          date: '2026-03-20',
          quantity_e8: 10000000000,
          gross_amount_cents: 350000,
          fees_cents: 0,
          taxes_cents: 0,
          net_amount_cents: 350000,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(accService.listAccounts).mockResolvedValue([
        {
          id: 'acc_1',
          user_id: 'usr_1',
          institution_id: 'inst_1',
          name: 'XP Investimentos',
          account_type: 'investment',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(assetService.listAssets).mockResolvedValue([
        {
          id: 'ast_1',
          user_id: 'usr_1',
          ticker: 'PETR4',
          name: 'Petrobras PN',
          asset_class: 'equities',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])

      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      )

      await waitFor(() => {
        // R$ 28.500,00 total = 25.000 (caixa) + 3.500 (ativo)
        expect(screen.getByText('R$ 28.500,00')).not.toBeNull()
        expect(screen.getByText('R$ 25.000,00')).not.toBeNull()
        expect(screen.getByText('PETR4')).not.toBeNull()
        expect(screen.getByText(/Maiores Posições/i)).not.toBeNull()
        expect(screen.getByText(/Movimentações Recentes/i)).not.toBeNull()
      })
    })
  })

  describe('2. Resumo Patrimonial (/overview/summary)', () => {
    it('renderiza EmptyState quando não há patrimônio consolidado', async () => {
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([])
      vi.mocked(posService.listPositions).mockResolvedValue([])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <SummaryPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Nenhum patrimônio consolidado para exibição/i)).not.toBeNull()
      })
    })

    it('renderiza totalizadores por moeda e saldos por conta sem misturar moedas', async () => {
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([
        {
          id: 'bal_brl',
          user_id: 'usr_1',
          account_id: 'acc_brl',
          currency: 'BRL',
          balance_cents: 1000000, // R$ 10.000,00
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        {
          id: 'bal_usd',
          user_id: 'usr_1',
          account_id: 'acc_usd',
          currency: 'USD',
          balance_cents: 200000, // $ 2.000,00
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(posService.listPositions).mockResolvedValue([])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([
        {
          id: 'acc_brl',
          user_id: 'usr_1',
          institution_id: 'inst_1',
          name: 'Itaú BRL',
          account_type: 'checking',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        {
          id: 'acc_usd',
          user_id: 'usr_1',
          institution_id: 'inst_2',
          name: 'Nomad Global',
          account_type: 'international_checking',
          currency: 'USD',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <SummaryPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getAllByText('R$ 10.000,00').length).toBeGreaterThan(0)
        expect(screen.getByText('Divisão de Patrimônio por Moeda')).not.toBeNull()
        expect(screen.getByText('BRL')).not.toBeNull()
        expect(screen.getByText('USD')).not.toBeNull()
        expect(screen.getAllByText('$ 2.000,00').length).toBeGreaterThan(0)
      })
    })
  })

  describe('3. Evolução do Patrimônio (/overview/evolution)', () => {
    it('renderiza EmptyState quando não há histórico de movimentações', async () => {
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <EvolutionPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Histórico de evolução temporal não disponível/i)).not.toBeNull()
      })
    })

    it('renderiza agregados mensais de aportes e resgates', async () => {
      vi.mocked(movService.listMovements).mockResolvedValue([
        {
          id: 'mov_dep_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          movement_type: 'deposit',
          date: '2026-01-15',
          gross_amount_cents: 500000, // R$ 5.000,00
          fees_cents: 0,
          taxes_cents: 0,
          net_amount_cents: 500000,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        {
          id: 'mov_dep_2',
          user_id: 'usr_1',
          account_id: 'acc_1',
          movement_type: 'deposit',
          date: '2026-02-10',
          gross_amount_cents: 300000, // R$ 3.000,00
          fees_cents: 0,
          taxes_cents: 0,
          net_amount_cents: 300000,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        {
          id: 'mov_with_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          movement_type: 'withdrawal',
          date: '2026-02-25',
          gross_amount_cents: 100000, // R$ 1.000,00
          fees_cents: 0,
          taxes_cents: 0,
          net_amount_cents: 100000,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <EvolutionPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getAllByText('R$ 8.000,00').length).toBeGreaterThan(0) // Aportes totais
        expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0) // Resgates totais
        expect(screen.getAllByText('R$ 7.000,00').length).toBeGreaterThan(0) // Líquido acumulado
        expect(screen.getByText('Histórico Mensal Consolidado')).not.toBeNull()
      })
    })
  })

  describe('4. Distribuição por Categoria (/overview/distribution)', () => {
    it('renderiza EmptyState quando não há ativos alocados nem caixa', async () => {
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([])
      vi.mocked(posService.listPositions).mockResolvedValue([])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <DistributionPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Nenhuma classe de ativos alocada/i)).not.toBeNull()
      })
    })

    it('renderiza distribuição por classes (Caixa, Ações, FIIs) e por instituição', async () => {
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([
        {
          id: 'bal_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          currency: 'BRL',
          balance_cents: 500000, // R$ 5.000,00 em caixa (50%)
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(posService.listPositions).mockResolvedValue([
        {
          id: 'pos_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          asset_id: 'ast_1',
          quantity_e8: 10000000000,
          average_price_cents: 5000,
          total_cost_cents: 500000, // R$ 5.000,00 em ações (50%)
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          expand: {
            asset_id: {
              id: 'ast_1',
              user_id: 'usr_1',
              ticker: 'ITUB4',
              name: 'Itaú Unibanco',
              asset_class: 'equities',
              currency: 'BRL',
              is_active: true,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        },
      ])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([
        {
          id: 'acc_1',
          user_id: 'usr_1',
          institution_id: 'inst_1',
          name: 'Itaú Corretora',
          account_type: 'investment',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(assetService.listAssets).mockResolvedValue([
        {
          id: 'ast_1',
          user_id: 'usr_1',
          ticker: 'ITUB4',
          name: 'Itaú Unibanco',
          asset_class: 'equities',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])

      render(
        <MemoryRouter>
          <DistributionPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getAllByText('Dinheiro em Caixa').length).toBeGreaterThan(0)
        expect(screen.getByText('Ações / Ações Globais')).not.toBeNull()
        expect(screen.getByText('Itaú Corretora')).not.toBeNull()
      })
    })
  })

  describe('5. Atividades Recentes (/overview/activities)', () => {
    it('renderiza EmptyState quando não há lançamentos na timeline', async () => {
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <ActivitiesPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Nenhuma atividade registrada na linha do tempo/i)).not.toBeNull()
      })
    })

    it('renderiza timeline cronológica com detalhes da operação e filtros', async () => {
      vi.mocked(movService.listMovements).mockResolvedValue([
        {
          id: 'mov_act_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          movement_type: 'deposit',
          date: '2026-03-24',
          gross_amount_cents: 1000000,
          fees_cents: 0,
          taxes_cents: 0,
          net_amount_cents: 1000000,
          notes: 'Aporte mensal da poupança',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(accService.listAccounts).mockResolvedValue([
        {
          id: 'acc_1',
          user_id: 'usr_1',
          institution_id: 'inst_1',
          name: 'Banco do Brasil',
          account_type: 'checking',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <ActivitiesPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText('Aporte / Depósito')).not.toBeNull()
        expect(screen.getAllByText(/Banco do Brasil/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/Aporte mensal da poupança/i)).not.toBeNull()
        expect(screen.getByText('+ R$ 10.000,00')).not.toBeNull()
      })
    })
  })

  describe('6. Próximos Vencimentos (/overview/due-dates)', () => {
    it('renderiza EmptyState quando não há títulos com vencimento', async () => {
      vi.mocked(posService.listPositions).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <DueDatesOverviewPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Sem vencimentos agendados para os próximos meses/i)).not.toBeNull()
      })
    })

    it('renderiza títulos com vencimento cadastrado ordenados por data', async () => {
      vi.mocked(posService.listPositions).mockResolvedValue([
        {
          id: 'pos_cdb',
          user_id: 'usr_1',
          account_id: 'acc_1',
          asset_id: 'ast_cdb',
          quantity_e8: 100000000, // 1 unidade
          average_price_cents: 100000, // R$ 1.000,00
          total_cost_cents: 100000,
          maturity_date: '2026-12-15',
          indexer: '110% CDI',
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          expand: {
            asset_id: {
              id: 'ast_cdb',
              user_id: 'usr_1',
              ticker: 'CDB-INTER-2026',
              name: 'CDB Banco Inter',
              asset_class: 'fixed_income',
              currency: 'BRL',
              is_active: true,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        },
      ])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([
        {
          id: 'ast_cdb',
          user_id: 'usr_1',
          ticker: 'CDB-INTER-2026',
          name: 'CDB Banco Inter',
          asset_class: 'fixed_income',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])

      render(
        <MemoryRouter>
          <DueDatesOverviewPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getAllByText('CDB-INTER-2026').length).toBeGreaterThan(0)
        expect(screen.getByText('110% CDI')).not.toBeNull()
        expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0)
      })
    })
  })

  describe('7. Progresso das Metas (/overview/goals)', () => {
    it('renderiza EmptyState quando não há carteiras', async () => {
      vi.mocked(portService.listPortfolios).mockResolvedValue([])
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([])
      vi.mocked(posService.listPositions).mockResolvedValue([])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <GoalsOverviewPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Nenhuma meta financeira cadastrada/i)).not.toBeNull()
      })
    })

    it('renderiza progresso percentual da meta contra o patrimônio consolidado', async () => {
      vi.mocked(portService.listPortfolios).mockResolvedValue([
        {
          id: 'port_1',
          user_id: 'usr_1',
          name: 'Reserva de Emergência',
          description: '6 meses de custo fixo',
          target_amount_cents: 5000000, // R$ 50.000,00
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(accBalService.listAccountBalances).mockResolvedValue([
        {
          id: 'bal_1',
          user_id: 'usr_1',
          account_id: 'acc_1',
          currency: 'BRL',
          balance_cents: 2500000, // R$ 25.000,00 (50% da meta)
          last_recalculated_at: new Date().toISOString(),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ])
      vi.mocked(posService.listPositions).mockResolvedValue([])
      vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])
      vi.mocked(movService.listMovements).mockResolvedValue([])
      vi.mocked(accService.listAccounts).mockResolvedValue([])
      vi.mocked(assetService.listAssets).mockResolvedValue([])

      render(
        <MemoryRouter>
          <GoalsOverviewPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText('Reserva de Emergência')).not.toBeNull()
        expect(screen.getByText('50.0%')).not.toBeNull()
        expect(screen.getByText('Meta: R$ 50.000,00')).not.toBeNull()
      })
    })
  })

  describe('8. Central de Alertas (/overview/alerts)', () => {
    it('renderiza EmptyState quando não há alertas ativos', async () => {
      vi.mocked(alertsService.listAlerts).mockResolvedValue([])

      render(
        <MemoryRouter>
          <AlertsPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Nenhum alerta pendente no momento/i)).not.toBeNull()
      })
    })

    it('renderiza alertas vindos do serviço alerts com badges e contador', async () => {
      vi.mocked(alertsService.listAlerts).mockResolvedValue([
        {
          id: 'alt_1',
          user_id: 'usr_1',
          type: 'balance_negative',
          title: 'Saldo Negativo em Caixa: Bradesco Corrente',
          message: 'A conta Bradesco Corrente apresenta saldo devedor de BRL -450,00.',
          severity: 'warn',
          reference_id: 'acc_1',
          is_read: false,
          created: '2026-09-23T06:00:00.000Z',
          updated: '2026-09-23T06:00:00.000Z',
        },
        {
          id: 'alt_2',
          user_id: 'usr_1',
          type: 'maturity_upcoming',
          title: 'Vencimento em 30 dias: CDB Banco Master',
          message: 'O título CDB Banco Master vencerá em 30 dias.',
          severity: 'info',
          reference_id: 'pos_1',
          due_date: '2026-10-23T00:00:00.000Z',
          is_read: false,
          created: '2026-09-23T06:00:00.000Z',
          updated: '2026-09-23T06:00:00.000Z',
        },
      ])

      render(
        <MemoryRouter>
          <AlertsPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByText(/Saldo Negativo em Caixa: Bradesco Corrente/i)).not.toBeNull()
        expect(screen.getByText(/Vencimento em 30 dias: CDB Banco Master/i)).not.toBeNull()
        expect(screen.getByText(/2 alerta\(s\) não lido\(s\)/i)).not.toBeNull()
      })
    })
  })
})
