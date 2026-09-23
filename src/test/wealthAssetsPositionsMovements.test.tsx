import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AssetsPage from '@/pages/wealth/Assets'
import MovementsPage from '@/pages/wealth/Movements'
import PositionsPage from '@/pages/wealth/Positions'
import * as assetService from '@/services/assets'
import * as movService from '@/services/movements'
import * as posService from '@/services/positions'
import * as accService from '@/services/accounts'
import * as balService from '@/services/accountBalances'

vi.mock('@/services/assets')
vi.mock('@/services/movements')
vi.mock('@/services/positions')
vi.mock('@/services/accounts')
vi.mock('@/services/accountBalances')

describe('CRUD de Ativos (/wealth/assets)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Exibe EmptyState com ação "Criar primeiro ativo" quando não há registros', async () => {
    vi.mocked(assetService.listAssets).mockResolvedValue([])

    render(
      <MemoryRouter>
        <AssetsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Nenhum ativo cadastrado no catálogo/i)).not.toBeNull()
      expect(screen.getByRole('button', { name: /Criar primeiro ativo/i })).not.toBeNull()
    })
  })

  it('2. Lista ativos cadastrados com ticker, classe e status', async () => {
    vi.mocked(assetService.listAssets).mockResolvedValue([
      {
        id: 'ast_1',
        user_id: 'usr_1',
        ticker: 'PETR4',
        name: 'Petróleo Brasileiro S.A.',
        asset_class: 'equities',
        sub_type: 'Ação Preferencial',
        currency: 'BRL',
        cnpj_issuer: '33.000.167/0001-01',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_2',
        user_id: 'usr_1',
        ticker: 'HGLG11',
        name: 'CSHG Logística FII',
        asset_class: 'real_estate_funds',
        sub_type: 'Tijolo / Logística',
        currency: 'BRL',
        is_active: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])

    render(
      <MemoryRouter>
        <AssetsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('PETR4')).not.toBeNull()
      expect(screen.getByText('Petróleo Brasileiro S.A.')).not.toBeNull()
      expect(screen.getByText('Ações / Ações Globais')).not.toBeNull()
      expect(screen.getByText('HGLG11')).not.toBeNull()
      expect(screen.getByText('Fundos Imobiliários (FII)')).not.toBeNull()
      expect(screen.getByText('Ativo')).not.toBeNull()
      expect(screen.getByText('Inativo')).not.toBeNull()
    })
  })

  it('3. Criação de ativo trata duplicidade de ticker com mensagem amigável', async () => {
    vi.mocked(assetService.listAssets).mockResolvedValue([])
    vi.mocked(assetService.createAsset).mockRejectedValue(
      new Error('Você já possui um ativo com este ticker.'),
    )

    render(
      <MemoryRouter>
        <AssetsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Criar primeiro ativo/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Criar primeiro ativo/i }))

    const tickerInput = screen.getByPlaceholderText('PETR4')
    fireEvent.change(tickerInput, { target: { value: 'PETR4' } })

    const nameInput = screen.getByPlaceholderText(/Ex.: Petrobras PN/i)
    fireEvent.change(nameInput, { target: { value: 'Petrobras PN' } })

    const submitBtn = screen.getByRole('button', { name: /Criar Ativo/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(assetService.createAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'PETR4',
          name: 'Petrobras PN',
        }),
      )
    })
  })
})

describe('CRUD de Movimentações (/wealth/movements)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(movService.brlToCents).mockImplementation((val) => {
      if (!val) return 0
      const parsed = Number.parseFloat(String(val).replace(',', '.'))
      return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100)
    })
    vi.mocked(movService.decimalToE8).mockImplementation((val) => {
      if (!val) return 0
      const parsed = Number.parseFloat(String(val).replace(',', '.'))
      return Number.isNaN(parsed) ? 0 : Math.round(parsed * 100000000)
    })
    vi.mocked(movService.formatQuantityE8).mockImplementation((e8) =>
      e8 ? String(e8 / 100000000) : '0',
    )
  })

  it('1. Exibe EmptyState com ação de primeira movimentação quando não há registros', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(assetService.listAssets).mockResolvedValue([])

    render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma movimentação lançada/i)).not.toBeNull()
      expect(
        screen.getByRole('button', { name: /Registrar primeira movimentação/i }),
      ).not.toBeNull()
    })
  })

  it('2. Lista movimentações registradas com tipo, ativo, conta e valor líquido', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([
      {
        id: 'mov_1',
        user_id: 'usr_1',
        account_id: 'acc_1',
        asset_id: 'ast_1',
        movement_type: 'buy',
        date: '2026-03-20',
        quantity_e8: 10000000000, // 100 cotas
        unit_price_cents: 3550, // R$ 35,50
        gross_amount_cents: 355000, // R$ 3.550,00
        fees_cents: 500, // R$ 5,00
        taxes_cents: 0,
        net_amount_cents: 354500, // R$ 3.545,00
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        expand: {
          account_id: {
            id: 'acc_1',
            user_id: 'usr_1',
            institution_id: 'inst_1',
            name: 'Conta Investimento XP',
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
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(assetService.listAssets).mockResolvedValue([])

    render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('PETR4')).not.toBeNull()
      expect(screen.getByText('Conta Investimento XP')).not.toBeNull()
      expect(screen.getByText(/Compra de Ativo/i)).not.toBeNull()
    })
  })

  it('3. Criação de movimentação converte quantidade para escala e8 e calcula líquido', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'Conta XP',
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
        ticker: 'VALE3',
        name: 'Vale ON',
        asset_class: 'equities',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])
    vi.mocked(movService.createMovement).mockResolvedValue({
      id: 'mov_new',
      user_id: 'usr_1',
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'buy',
      date: '2026-03-24',
      gross_amount_cents: 600000,
      fees_cents: 0,
      taxes_cents: 0,
      net_amount_cents: 600000,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Registrar primeira movimentação/i }),
      ).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Registrar primeira movimentação/i }))

    // Preenche valor bruto
    const grossInput = screen.getByPlaceholderText('0,00')
    fireEvent.change(grossInput, { target: { value: '6000' } })

    const submitBtn = screen.getByRole('button', { name: /Confirmar Lançamento/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(movService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 'acc_1',
          asset_id: 'ast_1',
          movement_type: 'buy',
          gross_amount_cents: 600000,
        }),
      )
    })
  })

  it('4. Edição de movimentação abre formulário preenchido e chama updateMovement', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([
      {
        id: 'mov_to_edit',
        user_id: 'usr_1',
        account_id: 'acc_1',
        asset_id: 'ast_1',
        movement_type: 'buy',
        date: '2026-03-20',
        quantity_e8: 10000000000,
        unit_price_cents: 3550,
        gross_amount_cents: 355000,
        fees_cents: 500,
        taxes_cents: 0,
        net_amount_cents: 355500,
        is_reversed: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        expand: {
          account_id: {
            id: 'acc_1',
            user_id: 'usr_1',
            institution_id: 'inst_1',
            name: 'Conta XP',
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
    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'Conta XP',
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
    vi.mocked(movService.updateMovement).mockResolvedValue({
      id: 'mov_to_edit',
      user_id: 'usr_1',
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'buy',
      date: '2026-03-20',
      quantity_e8: 10000000000,
      unit_price_cents: 3550,
      gross_amount_cents: 400000,
      fees_cents: 500,
      taxes_cents: 0,
      net_amount_cents: 400500,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }))

    await waitFor(() => {
      expect(screen.getByText('Editar Movimentação')).not.toBeNull()
      expect(screen.getByRole('button', { name: /Salvar Alterações/i })).not.toBeNull()
    })

    // Altera o valor bruto para 4000
    const grossInput = screen.getByLabelText(/Valor Bruto/i)
    fireEvent.change(grossInput, { target: { value: '4000' } })

    const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(movService.updateMovement).toHaveBeenCalledWith(
        'mov_to_edit',
        expect.objectContaining({
          account_id: 'acc_1',
          asset_id: 'ast_1',
          movement_type: 'buy',
          gross_amount_cents: 400000,
        }),
      )
    })
  })

  it('5. Compra exibe Emolumentos e Liquidação (sem IR), resume Custo total e envia fees_cents somados e taxes_cents = 0', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'Conta XP',
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
        ticker: 'VALE3',
        name: 'Vale ON',
        asset_class: 'equities',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])
    vi.mocked(movService.createMovement).mockResolvedValue({
      id: 'mov_buy_test',
      user_id: 'usr_1',
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'buy',
      date: '2026-03-24',
      gross_amount_cents: 1000000,
      fees_cents: 4000,
      taxes_cents: 0,
      net_amount_cents: 1004000,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Registrar primeira movimentação/i }),
      ).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Registrar primeira movimentação/i }))

    // O modal abre com padrão 'buy'
    // Verifica que existem os campos "Emolumentos" e "Liquidação"
    expect(screen.getByLabelText(/Emolumentos/i)).not.toBeNull()
    expect(screen.getByLabelText(/^Liquidação/i)).not.toBeNull()
    // E NÃO deve existir o campo de IR na compra
    expect(screen.queryByLabelText(/IR \(R\$\)/i)).toBeNull()
    // Resumo deve ser "Custo total da aquisição"
    expect(screen.getByText(/Custo total da aquisição/i)).not.toBeNull()

    // Preenche valor bruto (10000), emolumentos (15) e liquidação (25)
    fireEvent.change(screen.getByLabelText(/Valor Bruto/i), { target: { value: '10000' } })
    fireEvent.change(screen.getByLabelText(/Emolumentos/i), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText(/^Liquidação/i), { target: { value: '25' } })

    const submitBtn = screen.getByRole('button', { name: /Confirmar Lançamento/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(movService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 'acc_1',
          asset_id: 'ast_1',
          movement_type: 'buy',
          gross_amount_cents: 1000000,
          fees_cents: 4000, // 1500 + 2500
          taxes_cents: 0, // Compra não tem IR
          net_amount_cents: 1004000, // 1000000 + 4000
        }),
      )
    })
  })

  it('6. Lançamento de Renda Fixa adapta campos para Valor Aplicado e quantidade padrão 1', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'Banco XP',
        account_type: 'investment',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])
    vi.mocked(assetService.listAssets).mockResolvedValue([
      {
        id: 'ast_rf',
        user_id: 'usr_1',
        ticker: 'CDB-ITAU-2028',
        name: 'CDB Itaú 120% CDI',
        asset_class: 'fixed_income',
        sub_type: 'CDB (Certificado de Depósito Bancário)',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])
    vi.mocked(movService.createMovement).mockResolvedValue({
      id: 'mov_rf_created',
      user_id: 'usr_1',
      account_id: 'acc_1',
      asset_id: 'ast_rf',
      movement_type: 'buy',
      date: '2026-03-24',
      quantity_e8: 100000000, // 1 unidade
      unit_price_cents: 500000, // R$ 5.000,00
      gross_amount_cents: 500000,
      fees_cents: 0,
      taxes_cents: 0,
      net_amount_cents: 500000,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Registrar primeira movimentação/i }),
      ).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Registrar primeira movimentação/i }))

    await waitFor(() => {
      expect(screen.getByText(/Lançamento de Título de Renda Fixa/i)).not.toBeNull()
      expect(screen.getByLabelText(/Valor Aplicado \/ Investido/i)).not.toBeNull()
    })

    // Preenche valor aplicado de R$ 5.000
    fireEvent.change(screen.getByLabelText(/Valor Aplicado \/ Investido/i), {
      target: { value: '5000' },
    })

    const submitBtn = screen.getByRole('button', { name: /Confirmar Lançamento/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(movService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: 'acc_1',
          asset_id: 'ast_rf',
          movement_type: 'buy',
          gross_amount_cents: 500000,
          quantity_e8: 100000000, // padronizado em 1 se não informado
          unit_price_cents: 500000,
        }),
      )
    })
  })
})

describe('Posições em Custódia (/wealth/positions)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(movService.formatQuantityE8).mockImplementation((e8) =>
      e8 ? String(e8 / 100000000) : '0',
    )
  })

  it('1. Exibe EmptyState quando não há posições nem movimentações', async () => {
    vi.mocked(posService.listPositions).mockResolvedValue([])
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(assetService.listAssets).mockResolvedValue([])
    vi.mocked(balService.listAccountBalances).mockResolvedValue([])
    vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])

    render(
      <MemoryRouter>
        <PositionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma posição em custódia encontrada/i)).not.toBeNull()
      expect(screen.getByRole('button', { name: /Ir para Movimentações/i })).not.toBeNull()
    })
  })

  it('2. Exibe Dinheiro em Caixa destacado por conta e no resumo consolidado', async () => {
    vi.mocked(posService.listPositions).mockResolvedValue([])
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'Itaú Conta Corrente',
        account_type: 'checking',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])
    vi.mocked(assetService.listAssets).mockResolvedValue([])
    vi.mocked(balService.listAccountBalances).mockResolvedValue([
      {
        id: 'bal_1',
        user_id: 'usr_1',
        account_id: 'acc_1',
        currency: 'BRL',
        balance_cents: 1500000, // R$ 15.000,00
        last_recalculated_at: new Date().toISOString(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        expand: {
          account_id: {
            id: 'acc_1',
            user_id: 'usr_1',
            institution_id: 'inst_1',
            name: 'Itaú Conta Corrente',
            account_type: 'checking',
            currency: 'BRL',
            is_active: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        },
      },
    ])
    vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([])

    render(
      <MemoryRouter>
        <PositionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Dinheiro em Caixa Disponível/i)).not.toBeNull()
      expect(screen.getByText(/Dinheiro em Caixa \(Disponível para Transações\)/i)).not.toBeNull()
      expect(screen.getByText('Itaú Conta Corrente')).not.toBeNull()
      expect(screen.getAllByText('R$ 15.000,00').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('3. Exibe posições derivadas das movimentações com cálculo de Preço Médio e e8', async () => {
    vi.mocked(posService.listPositions).mockResolvedValue([])
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(assetService.listAssets).mockResolvedValue([])
    vi.mocked(balService.listAccountBalances).mockResolvedValue([])

    vi.mocked(posService.derivePositionsFromMovements).mockReturnValue([
      {
        key: 'acc_1_ast_1',
        account_id: 'acc_1',
        asset_id: 'ast_1',
        account: {
          id: 'acc_1',
          user_id: 'usr_1',
          institution_id: 'inst_1',
          name: 'BTG Investimentos',
          account_type: 'investment',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        asset: {
          id: 'ast_1',
          user_id: 'usr_1',
          ticker: 'ITUB4',
          name: 'Itaú Unibanco PN',
          asset_class: 'equities',
          currency: 'BRL',
          is_active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        quantity_e8: 20000000000, // 200 cotas
        average_price_cents: 3250, // R$ 32,50
        total_cost_cents: 650000, // R$ 6.500,00
        movementsCount: 2,
      },
    ])

    render(
      <MemoryRouter>
        <PositionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('ITUB4')).not.toBeNull()
      expect(screen.getByText('Itaú Unibanco PN')).not.toBeNull()
      expect(screen.getByText('BTG Investimentos')).not.toBeNull()
      // A coluna Origem ("Derivado (2 movs)") foi removida a pedido do usuário
      expect(screen.queryByText(/Derivado \(2 movs\)/i)).toBeNull()
      expect(screen.queryByText(/^Origem$/i)).toBeNull()
    })
  })

  it('4. Permite alternar entre o modo Tabela Única e Modo Agrupado por Classe com expansão/retração', async () => {
    vi.mocked(posService.listPositions).mockResolvedValue([
      {
        id: 'pos_1',
        user_id: 'usr_1',
        account_id: 'acc_1',
        asset_id: 'ast_1',
        quantity_e8: 10000000000,
        average_price_cents: 3500,
        total_cost_cents: 350000,
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
      {
        id: 'pos_2',
        user_id: 'usr_1',
        account_id: 'acc_1',
        asset_id: 'ast_2',
        quantity_e8: 100000000, // 1 título
        average_price_cents: 1000000,
        total_cost_cents: 1000000,
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
            id: 'ast_2',
            user_id: 'usr_1',
            ticker: 'CDB-DI',
            name: 'CDB Banco Master 120% CDI',
            asset_class: 'fixed_income',
            sub_type: 'CDB (Certificado de Depósito Bancário)',
            currency: 'BRL',
            is_active: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
        },
      },
    ])
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(assetService.listAssets).mockResolvedValue([])
    vi.mocked(balService.listAccountBalances).mockResolvedValue([])

    render(
      <MemoryRouter>
        <PositionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('PETR4')).not.toBeNull()
      expect(screen.getByText('CDB-DI')).not.toBeNull()
    })

    // Alterna para o modo agrupado por classe
    const groupedToggleBtn = screen.getByRole('button', { name: /Agrupado por Classe/i })
    fireEvent.click(groupedToggleBtn)

    await waitFor(() => {
      // Devem aparecer os cabeçalhos das classes agrupadas
      expect(screen.getByText('Ações / Ações Globais')).not.toBeNull()
      expect(screen.getByText('Renda Fixa')).not.toBeNull()
    })

    // Retrai e expande grupos
    const collapseAllBtn = screen.getByRole('button', { name: /Retrair tudo/i })
    fireEvent.click(collapseAllBtn)

    // Ao retrair, a tabela da classe fica oculta mas o cabeçalho continua visível
    const expandAllBtn = screen.getByRole('button', { name: /Expandir tudo/i })
    fireEvent.click(expandAllBtn)

    await waitFor(() => {
      expect(screen.getByText('Petrobras PN')).not.toBeNull()
      expect(screen.getByText('CDB Banco Master 120% CDI')).not.toBeNull()
    })
  })

  it('5. Permite filtrar posições através dos componentes de múltipla escolha', async () => {
    vi.mocked(posService.listPositions).mockResolvedValue([
      {
        id: 'pos_1',
        user_id: 'usr_1',
        account_id: 'acc_1',
        asset_id: 'ast_1',
        quantity_e8: 10000000000,
        average_price_cents: 3500,
        total_cost_cents: 350000,
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
    vi.mocked(movService.listMovements).mockResolvedValue([])
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
    vi.mocked(balService.listAccountBalances).mockResolvedValue([])

    render(
      <MemoryRouter>
        <PositionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /^Ativo$/i })).not.toBeNull()
      expect(screen.getByRole('combobox', { name: /^Conta$/i })).not.toBeNull()
      expect(screen.getByRole('combobox', { name: /^Classe$/i })).not.toBeNull()
    })
  })
})
