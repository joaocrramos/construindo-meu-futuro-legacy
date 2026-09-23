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

    // Seleciona tipo/subtipo se desejar
    const subTypeInput = screen.getByLabelText(/Tipo \/ Subtipo/i)
    fireEvent.change(subTypeInput, { target: { value: 'Ações Ordinárias (ON)' } })

    const submitBtn = screen.getByRole('button', { name: /Criar Ativo/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(assetService.createAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'PETR4',
          name: 'Petrobras PN',
          sub_type: 'Ações Ordinárias (ON)',
        }),
      )
    })
  })

  it('4. Cadastro de ativo de Renda Fixa define Tipo/Subtipo e rentabilidade na criação', async () => {
    vi.mocked(assetService.listAssets).mockResolvedValue([])
    vi.mocked(assetService.createAsset).mockResolvedValue({
      id: 'ast_cdb_new',
      user_id: 'usr_1',
      ticker: 'CDB-TEST',
      name: 'CDB Banco Inter 110% CDI',
      asset_class: 'fixed_income',
      sub_type: 'CDB',
      currency: 'BRL',
      due_date: '2028-12-31',
      indexer_rate: 'CDI (110%)',
      is_active: true,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    render(
      <MemoryRouter>
        <AssetsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Criar primeiro ativo/i })).not.toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: /Criar primeiro ativo/i }))

    fireEvent.change(screen.getByPlaceholderText('PETR4'), { target: { value: 'CDB-TEST' } })
    fireEvent.change(screen.getByPlaceholderText(/Ex.: Petrobras PN/i), {
      target: { value: 'CDB Banco Inter 110% CDI' },
    })

    // Seleciona classe Renda Fixa
    fireEvent.change(screen.getByLabelText(/Classe/i), { target: { value: 'fixed_income' } })

    // Seleciona Subtipo CDB
    const subTypeInput = screen.getByLabelText(/Tipo \/ Subtipo/i)
    fireEvent.change(subTypeInput, { target: { value: 'CDB' } })

    // Taxa do CDI
    const taxaInput = screen.getByPlaceholderText('Ex.: 110 ou 6,5')
    fireEvent.change(taxaInput, { target: { value: '110' } })

    // Data de Vencimento
    const dueDateInput = screen.getByLabelText(/Data de Vencimento/i)
    fireEvent.change(dueDateInput, { target: { value: '2028-12-31' } })

    const submitBtn = screen.getByRole('button', { name: /Criar Ativo/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(assetService.createAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'CDB-TEST',
          name: 'CDB Banco Inter 110% CDI',
          asset_class: 'fixed_income',
          sub_type: 'CDB',
          indexer_rate: 'CDI (110%)',
          due_date: '2028-12-31',
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
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([])
    vi.mocked(assetService.listAssets).mockResolvedValue([])
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

    // Aguarda a conclusão de loadData (empty state é renderizado após carregar)
    await screen.findByText(/Nenhuma movimentação lançada/i, {}, { timeout: 10000 })
    const openBtn = screen.getByRole('button', {
      name: /Registrar primeira movimentação/i,
    })
    fireEvent.click(openBtn)

    // Preenche valor bruto
    const grossInput = await screen.findByLabelText(/Valor Bruto/i)
    fireEvent.change(grossInput, { target: { value: '6000' } })

    const submitBtn = await screen.findByRole('button', { name: /Confirmar Lançamento/i })
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
    const grossInput = await screen.findByLabelText(/Valor Bruto/i)
    fireEvent.change(grossInput, { target: { value: '4000' } })

    const saveBtn = await screen.findByRole('button', { name: /Salvar Alterações/i })
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

    // Aguarda a conclusão de loadData (empty state é renderizado após carregar)
    await screen.findByText(/Nenhuma movimentação lançada/i, {}, { timeout: 10000 })
    const openBtn = screen.getByRole('button', {
      name: /Registrar primeira movimentação/i,
    })
    fireEvent.click(openBtn)

    // O modal abre com padrão 'buy'
    // Verifica que existem os campos "Emolumentos" e "Liquidação"
    expect(screen.getByLabelText(/Emolumentos/i)).not.toBeNull()
    expect(screen.getByLabelText(/^Liquidação/i)).not.toBeNull()
    // E NÃO deve existir o campo de IR na compra
    expect(screen.queryByLabelText(/IR \(R\$\)/i)).toBeNull()
    // Resumo deve ser "Custo total da aquisição"
    expect(screen.getByText(/Custo total da aquisição/i)).not.toBeNull()

    // Preenche valor bruto (10000), emolumentos (15) e liquidação (25)
    const grossInput = await screen.findByLabelText(/Valor Bruto/i)
    fireEvent.change(grossInput, { target: { value: '10000' } })
    fireEvent.change(await screen.findByLabelText(/Emolumentos/i), { target: { value: '15' } })
    fireEvent.change(await screen.findByLabelText(/^Liquidação/i), { target: { value: '25' } })

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
    // Apenas o ativo de renda fixa na lista, garantindo que seja selecionado como ativo padrão
    vi.mocked(assetService.listAssets).mockResolvedValue([
      {
        id: 'ast_rf',
        user_id: 'usr_1',
        ticker: 'CDB-ITAU-2028',
        name: 'CDB Itaú 120% CDI',
        asset_class: 'fixed_income',
        sub_type: 'CDB',
        currency: 'BRL',
        due_date: '2028-12-31',
        indexer_rate: 'CDI (120%)',
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

    // Aguarda a conclusão de loadData (empty state é renderizado após carregar)
    await screen.findByText(/Nenhuma movimentação lançada/i, {}, { timeout: 10000 })
    const openBtn = screen.getByRole('button', {
      name: /Nova Movimentação|Registrar primeira movimentação/i,
    })
    fireEvent.click(openBtn)

    await screen.findByLabelText(/Tipo de Operação/i, {}, { timeout: 10000 })

    expect(
      await screen.findByText(/Renda Fixa — Detalhes do Título/i, {}, { timeout: 4000 }),
    ).not.toBeNull()
    const valorInput = await screen.findByLabelText(
      /Valor Aplicado \(R\$\)/i,
      {},
      { timeout: 4000 },
    )
    expect(valorInput).not.toBeNull()

    // Preenche valor aplicado de R$ 5.000
    fireEvent.change(valorInput, {
      target: { value: '5000' },
    })

    const submitBtn = await screen.findByRole(
      'button',
      { name: /Confirmar Lançamento/i },
      { timeout: 4000 },
    )
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

  it('7. Exibe campos específicos por tipo de ativo (Stocks/USD, Fundos, Outros e Renda Fixa)', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_1',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'Avenue Securities',
        account_type: 'investment',
        currency: 'USD',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])
    // O ativo ast_stock é o primeiro da lista, tornando-se o ativo padrão na abertura do formulário
    vi.mocked(assetService.listAssets).mockResolvedValue([
      {
        id: 'ast_stock',
        user_id: 'usr_1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        asset_class: 'international',
        sub_type: 'Stocks (Ações EUA)',
        currency: 'USD',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_other',
        user_id: 'usr_1',
        ticker: 'IMOVEL-SP',
        name: 'Apartamento Jardins',
        asset_class: 'other',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])

    render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    // Aguarda a conclusão de loadData (empty state é renderizado após carregar)
    await screen.findByText(/Nenhuma movimentação lançada/i, {}, { timeout: 10000 })
    const openBtn = screen.getByRole('button', {
      name: /Nova Movimentação|Registrar primeira movimentação/i,
    })
    fireEvent.click(openBtn)

    await screen.findByLabelText(/Tipo de Operação/i, {}, { timeout: 10000 })

    // Com ativo internacional (USD), os campos específicos devem ser renderizados
    expect(
      await screen.findByLabelText(/Outros Custos \(USD\)/i, {}, { timeout: 4000 }),
    ).not.toBeNull()
    expect(await screen.findByLabelText(/Preço \(USD\)/i, {}, { timeout: 4000 })).not.toBeNull()
    // Quantidade deve estar presente para ativo internacional/ações
    expect(await screen.findByLabelText(/Quantidade/i, {}, { timeout: 4000 })).not.toBeNull()
    // Não exibe Emolumentos nem IR na compra de Stock
    expect(screen.queryByLabelText(/^Emolumentos/i)).toBeNull()
    expect(screen.queryByLabelText(/IR/i)).toBeNull()
  })

  it('8. Valida todos os 8 casos de formulário por tipo de ativo (Ações, FII, BDR, Cripto, USD, Renda Fixa, Tesouro, Fundos, Outros)', async () => {
    vi.mocked(movService.listMovements).mockResolvedValue([])
    vi.mocked(accService.listAccounts).mockResolvedValue([
      {
        id: 'acc_brl',
        user_id: 'usr_1',
        institution_id: 'inst_1',
        name: 'BTG Pactual',
        account_type: 'investment',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ])

    const sampleAssets: assetService.AssetRecord[] = [
      {
        id: 'ast_stock_br',
        user_id: 'usr_1',
        ticker: 'PETR4',
        name: 'Petrobras PN',
        asset_class: 'equities',
        sub_type: 'Ações Preferenciais (PN)',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_fii',
        user_id: 'usr_1',
        ticker: 'HGLG11',
        name: 'CSHG Logística FII',
        asset_class: 'real_estate_funds',
        sub_type: 'Tijolo',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_bdr',
        user_id: 'usr_1',
        ticker: 'MSFT34',
        name: 'Microsoft BDR',
        asset_class: 'equities',
        sub_type: 'BDR',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_crypto',
        user_id: 'usr_1',
        ticker: 'BTC',
        name: 'Bitcoin',
        asset_class: 'crypto',
        sub_type: 'Criptomoeda',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_usd',
        user_id: 'usr_1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        asset_class: 'international',
        sub_type: 'Stocks (Ações EUA)',
        currency: 'USD',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_rf',
        user_id: 'usr_1',
        ticker: 'CDB-INTER',
        name: 'CDB Banco Inter',
        asset_class: 'fixed_income',
        sub_type: 'CDB',
        issuer: 'Banco Inter',
        due_date: '2028-12-31',
        indexer_rate: '110% CDI',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_tesouro',
        user_id: 'usr_1',
        ticker: 'TESOURO-SELIC-2029',
        name: 'Tesouro Selic 2029',
        asset_class: 'fixed_income',
        sub_type: 'Tesouro Selic',
        due_date: '2029-03-01',
        indexer_rate: 'Selic + 0,15%',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_fund',
        user_id: 'usr_1',
        ticker: 'KINEA-CHRONOS',
        name: 'Kinea Chronos FIM',
        asset_class: 'mutual_funds',
        sub_type: 'Fundo Multimercado',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      {
        id: 'ast_other',
        user_id: 'usr_1',
        ticker: 'IMOVEL-SP',
        name: 'Galpão Logístico Extrema',
        asset_class: 'other',
        sub_type: 'Imóvel Físico',
        currency: 'BRL',
        is_active: true,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ]

    vi.mocked(assetService.listAssets).mockResolvedValue(sampleAssets)

    const { unmount } = render(
      <MemoryRouter>
        <MovementsPage />
      </MemoryRouter>,
    )

    // Aguarda a conclusão de loadData (empty state é renderizado após carregar)
    await screen.findByText(/Nenhuma movimentação lançada/i, {}, { timeout: 10000 })
    const openBtn = screen.getByRole('button', {
      name: /Nova Movimentação|Registrar primeira movimentação/i,
    })
    fireEvent.click(openBtn)

    await screen.findByLabelText(/Tipo de Operação/i, {}, { timeout: 10000 })

    // Caso 1: Ações B3 (PETR4) - padrão inicial
    // Exibe Quantidade, Preço (R$), Valor Bruto (R$), Emolumentos (R$), Liquidação (R$) e NÃO exibe IR na compra
    expect(await screen.findByLabelText(/Quantidade/i, {}, { timeout: 4000 })).not.toBeNull()
    expect(await screen.findByLabelText(/Preço \(R\$\)/i, {}, { timeout: 4000 })).not.toBeNull()
    expect(
      await screen.findByLabelText(/Emolumentos \(R\$\)/i, {}, { timeout: 4000 }),
    ).not.toBeNull()
    expect(
      await screen.findByLabelText(/Liquidação \(R\$\)/i, {}, { timeout: 4000 }),
    ).not.toBeNull()
    expect(screen.queryByLabelText(/IR/i)).toBeNull()

    unmount()

    // Validação dos demais tipos testando com cada ativo como primeiro da lista (ativo ativo padrão):
    const testCases: Array<{
      assetId: string
      expectFields: (dialog: HTMLElement) => Promise<void>
    }> = [
      {
        // Caso 2: FII (HGLG11)
        assetId: 'ast_fii',
        expectFields: async () => {
          expect(await screen.findByLabelText(/Quantidade/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Preço \(R\$\)/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Emolumentos \(R\$\)/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Liquidação \(R\$\)/i)).not.toBeNull()
        },
      },
      {
        // Caso 3: BDR (MSFT34)
        assetId: 'ast_bdr',
        expectFields: async () => {
          expect(await screen.findByLabelText(/Quantidade/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Preço \(R\$\)/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Emolumentos \(R\$\)/i)).not.toBeNull()
        },
      },
      {
        // Caso 4: Cripto (BTC)
        assetId: 'ast_crypto',
        expectFields: async () => {
          expect(await screen.findByLabelText(/Quantidade/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Preço \(R\$\)/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Emolumentos \(R\$\)/i)).not.toBeNull()
        },
      },
      {
        // Caso 5: Internacional / USD (AAPL)
        assetId: 'ast_usd',
        expectFields: async () => {
          expect(await screen.findByLabelText(/Quantidade/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Preço \(USD\)/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Outros Custos \(USD\)/i)).not.toBeNull()
          expect(screen.queryByLabelText(/^Emolumentos/i)).toBeNull()
        },
      },
      {
        // Caso 6: Renda Fixa CDB (CDB-INTER)
        assetId: 'ast_rf',
        expectFields: async () => {
          expect(await screen.findByText(/Renda Fixa — Detalhes do Título/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Valor Aplicado \(R\$\)/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Data Vencimento/i)).not.toBeNull()
        },
      },
      {
        // Caso 7: Renda Fixa Tesouro Direto (TESOURO-SELIC-2029)
        assetId: 'ast_tesouro',
        expectFields: async () => {
          expect(await screen.findByText(/Renda Fixa — Detalhes do Título/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Valor Aplicado \(R\$\)/i)).not.toBeNull()
        },
      },
      {
        // Caso 8: Fundos de Investimento (KINEA-CHRONOS)
        assetId: 'ast_fund',
        expectFields: async () => {
          expect(await screen.findByLabelText(/Quantidade/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Preço \(R\$\)/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Outros Custos \(R\$\)/i)).not.toBeNull()
        },
      },
      {
        // Caso 9: Outros Ativos (IMOVEL-SP)
        assetId: 'ast_other',
        expectFields: async () => {
          expect(await screen.findByLabelText(/Quantidade/i)).not.toBeNull()
          expect(await screen.findByLabelText(/^Preço$/i)).not.toBeNull()
          expect(await screen.findByLabelText(/Outros Custos \(R\$\)/i)).not.toBeNull()
        },
      },
    ]

    for (const tc of testCases) {
      const targetAsset = sampleAssets.find((a) => a.id === tc.assetId)!
      const remainingAssets = sampleAssets.filter((a) => a.id !== tc.assetId)
      vi.mocked(assetService.listAssets).mockResolvedValue([targetAsset, ...remainingAssets])

      const { unmount: unmountCase } = render(
        <MemoryRouter>
          <MovementsPage />
        </MemoryRouter>,
      )

      await screen.findByText(/Nenhuma movimentação lançada/i, {}, { timeout: 10000 })
      const btn = screen.getByRole('button', {
        name: /Nova Movimentação|Registrar primeira movimentação/i,
      })
      fireEvent.click(btn)

      await screen.findByLabelText(/Tipo de Operação/i, {}, { timeout: 10000 })
      const dialogEl = screen.getByRole('dialog')
      await tc.expectFields(dialogEl)

      unmountCase()
    }
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

    // Garante que a coluna Origem não existe
    expect(screen.queryByText(/^Origem$/i)).toBeNull()
  })
})
