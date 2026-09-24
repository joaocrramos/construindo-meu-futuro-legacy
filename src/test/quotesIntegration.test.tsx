import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PositionsPage from '@/pages/wealth/Positions'
import ConsolidationPage from '@/pages/wealth/Consolidation'
import * as quotesService from '@/services/quotes'
import * as accountsService from '@/services/accounts'
import * as assetsService from '@/services/assets'
import * as positionsService from '@/services/positions'
import * as accountBalancesService from '@/services/accountBalances'
import * as movementsService from '@/services/movements'

// Mock parcial OBRIGATÓRIO (regra do projeto e ADR-006): sempre usar importOriginal para preservar constantes
vi.mock('@/services/accounts', async (importOriginal) => {
  const actual = await importOriginal<typeof accountsService>()
  return {
    ...actual,
    listAccounts: vi.fn(),
  }
})

vi.mock('@/services/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof assetsService>()
  return {
    ...actual,
    listAssets: vi.fn(),
  }
})

vi.mock('@/services/positions', async (importOriginal) => {
  const actual = await importOriginal<typeof positionsService>()
  return {
    ...actual,
    listPositions: vi.fn(),
  }
})

vi.mock('@/services/accountBalances', async (importOriginal) => {
  const actual = await importOriginal<typeof accountBalancesService>()
  return {
    ...actual,
    listAccountBalances: vi.fn(),
  }
})

vi.mock('@/services/movements', async (importOriginal) => {
  const actual = await importOriginal<typeof movementsService>()
  return {
    ...actual,
    listMovements: vi.fn(),
  }
})

vi.mock('@/services/quotes', async (importOriginal) => {
  const actual = await importOriginal<typeof quotesService>()
  return {
    ...actual,
    listQuotes: vi.fn(),
    refreshQuotes: vi.fn(),
  }
})

describe('Integração de Cotações brapi.dev e Valor de Mercado', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(accountsService.listAccounts).mockResolvedValue([
      {
        id: 'acc-1',
        user_id: 'u1',
        institution_id: 'inst-1',
        name: 'XP Investimentos',
        account_type: 'investment',
        account_number: '1234',
        agency: '0001',
        currency: 'BRL',
        is_active: true,
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      {
        id: 'acc-2',
        user_id: 'u1',
        institution_id: 'inst-2',
        name: 'Avenue Securities',
        account_type: 'investment',
        account_number: '5678',
        agency: '0001',
        currency: 'USD',
        is_active: true,
        created: '2026-01-01',
        updated: '2026-01-01',
      },
    ])

    vi.mocked(assetsService.listAssets).mockResolvedValue([
      {
        id: 'ast-petr4',
        user_id: 'u1',
        ticker: 'PETR4',
        name: 'Petrobras PN',
        asset_class: 'equities',
        sub_type: 'stocks',
        currency: 'BRL',
        is_active: true,
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      {
        id: 'ast-cdb',
        user_id: 'u1',
        ticker: 'CDB XP 100%',
        name: 'CDB Banco XP',
        asset_class: 'fixed_income',
        sub_type: 'cdb',
        currency: 'BRL',
        due_date: '2026-12-31',
        is_active: true,
        created: '2026-01-01',
        updated: '2026-01-01',
      },
    ])

    vi.mocked(positionsService.listPositions).mockResolvedValue([
      {
        id: 'pos-1',
        user_id: 'u1',
        account_id: 'acc-1',
        asset_id: 'ast-petr4',
        quantity_e8: 10000000000, // 100 ações
        average_price_cents: 3000,
        total_cost_cents: 300000, // R$ 3.000,00 custo
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      {
        id: 'pos-2',
        user_id: 'u1',
        account_id: 'acc-1',
        asset_id: 'ast-cdb',
        quantity_e8: 500000000000,
        average_price_cents: 100,
        total_cost_cents: 500000, // R$ 5.000,00 aplicado
        created: '2026-01-01',
        updated: '2026-01-01',
      },
    ])

    vi.mocked(accountBalancesService.listAccountBalances).mockResolvedValue([
      {
        id: 'bal-1',
        user_id: 'u1',
        account_id: 'acc-1',
        currency: 'BRL',
        balance_cents: 100000, // R$ 1.000,00
        last_recalculated_at: '2026-01-01',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      {
        id: 'bal-2',
        user_id: 'u1',
        account_id: 'acc-2',
        currency: 'USD',
        balance_cents: 200000, // $ 2.000,00
        last_recalculated_at: '2026-01-01',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
    ])

    vi.mocked(movementsService.listMovements).mockResolvedValue([])

    vi.mocked(quotesService.listQuotes).mockResolvedValue([
      {
        id: 'q-petr4',
        ticker: 'PETR4',
        price_cents: 3850, // R$ 38,50 por cota
        currency: 'BRL',
        change_percent: 2.5,
        quoted_at: '2026-09-24T18:00:00.000Z',
        source: 'brapi.dev',
        created: '2026-09-24T18:00:00.000Z',
        updated: '2026-09-24T18:00:00.000Z',
      },
      {
        id: 'q-usd',
        ticker: 'USD-BRL',
        price_cents: 540, // R$ 5,40 por USD
        currency: 'BRL',
        change_percent: 0.1,
        quoted_at: '2026-09-24T18:00:00.000Z',
        source: 'brapi.dev',
        created: '2026-09-24T18:00:00.000Z',
        updated: '2026-09-24T18:00:00.000Z',
      },
    ])
  })

  it('exibe valor de mercado de ações com cotação da brapi.dev e mantém renda fixa por custo', async () => {
    render(<PositionsPage />)

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeInTheDocument()
    })

    // Renda fixa exibe "Renda Fixa" ou valor aplicado
    expect(screen.getByText('CDB XP 100%')).toBeInTheDocument()

    // 100 ações x R$ 38,50 = R$ 3.850,00 de valor de mercado para PETR4
    expect(screen.getByText('R$ 38,50')).toBeInTheDocument()
    expect(screen.getByText('R$ 3.850,00')).toBeInTheDocument()

    // Botão de atualizar cotações está presente
    const refreshBtn = screen.getByRole('button', { name: /Atualizar Cotações/i })
    expect(refreshBtn).toBeInTheDocument()

    // Clicar em Atualizar Cotações dispara o refreshQuotes
    vi.mocked(quotesService.refreshQuotes).mockResolvedValueOnce({
      success: true,
      updated_count: 2,
      tickers_count: 2,
    })

    await user.click(refreshBtn)

    await waitFor(() => {
      expect(quotesService.refreshQuotes).toHaveBeenCalledTimes(1)
    })
  })

  it('calcula conversão cambial USD para BRL na tela de Consolidação Patrimonial', async () => {
    render(<ConsolidationPage />)

    await waitFor(() => {
      expect(screen.getByText(/Consolidação Patrimonial/i)).toBeInTheDocument()
    })

    // Câmbio USD/BRL exibido a R$ 5,40
    expect(screen.getByText('R$ 5,40')).toBeInTheDocument()

    // Saldo da conta Avenue: $ 2.000,00 x 5,40 = R$ 10.800,00
    expect(screen.getByText('Avenue Securities')).toBeInTheDocument()
    expect(screen.getByText('R$ 10.800,00')).toBeInTheDocument()

    // Botão Atualizar Cotações presente na Consolidação
    const refreshBtn = screen.getByRole('button', { name: /Atualizar Cotações/i })
    expect(refreshBtn).toBeInTheDocument()
  })

  it('utilitários de cotação e câmbio em quotes.ts operam corretamente', () => {
    const mockQuotes: quotesService.QuoteRecord[] = [
      {
        id: '1',
        ticker: 'VALE3',
        price_cents: 6500,
        currency: 'BRL',
        created: '',
        updated: '',
      },
      {
        id: '2',
        ticker: 'EUR-BRL',
        price_cents: 610,
        currency: 'BRL',
        created: '',
        updated: '',
      },
    ]

    const valeQuote = quotesService.getQuoteForTicker(mockQuotes, 'vale3')
    expect(valeQuote?.price_cents).toBe(6500)

    // getQuote
    const directQuote = quotesService.getQuote('vale3', mockQuotes)
    expect(directQuote?.price_cents).toBe(6500)

    const eurRate = quotesService.getExchangeRateToBRL(mockQuotes, 'EUR')
    expect(eurRate).toBe(6.1)

    const brlRate = quotesService.getExchangeRateToBRL(mockQuotes, 'BRL')
    expect(brlRate).toBe(1)

    // getFxRate USD -> BRL e EUR -> BRL
    const fxEurBrl = quotesService.getFxRate('EUR', 'BRL', mockQuotes)
    expect(fxEurBrl).toBe(6.1)
    const fxBrlBrl = quotesService.getFxRate('BRL', 'BRL', mockQuotes)
    expect(fxBrlBrl).toBe(1)

    // Formato sem traço USDBRL
    const mockFxQuotes: quotesService.QuoteRecord[] = [
      {
        id: 'fx-usd',
        ticker: 'USDBRL',
        price_cents: 550,
        currency: 'BRL',
        source: 'brapi_fx',
        created: '',
        updated: '',
      },
    ]
    expect(quotesService.getFxRate('USD', 'BRL', mockFxQuotes)).toBe(5.5)
  })
})
