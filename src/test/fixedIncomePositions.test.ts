import { describe, it, expect } from 'vitest'
import { derivePositionsFromMovements } from '@/services/positions'
import type { MovementRecord } from '@/services/movements'
import type { AccountRecord } from '@/services/accounts'
import type { AssetRecord } from '@/services/assets'

describe('derivePositionsFromMovements - Renda Fixa por valor vs Ações por cotas', () => {
  const mockAccount: AccountRecord = {
    id: 'acc_xp_1',
    user_id: 'usr_1',
    institution_id: 'inst_xp',
    name: 'XP Investimentos',
    account_type: 'investment',
    currency: 'BRL',
    is_active: true,
    created: '2026-09-01T00:00:00.000Z',
    updated: '2026-09-01T00:00:00.000Z',
  }

  const mockCdbAsset: AssetRecord = {
    id: 'ast_cdb_xp',
    user_id: 'usr_1',
    ticker: 'CDBXP',
    name: 'CDB XP 100% CDI',
    asset_class: 'fixed_income',
    sub_type: 'CDB',
    due_date: '2026-09-30 00:00:00.000Z',
    indexer_rate: 'CDI (100%)',
    currency: 'BRL',
    is_active: true,
    created: '2026-09-01T00:00:00.000Z',
    updated: '2026-09-01T00:00:00.000Z',
  }

  const mockStockAsset: AssetRecord = {
    id: 'ast_petr4',
    user_id: 'usr_1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    asset_class: 'equities',
    currency: 'BRL',
    is_active: true,
    created: '2026-09-01T00:00:00.000Z',
    updated: '2026-09-01T00:00:00.000Z',
  }

  it('1. Compra de R$ 5.000 + Venda parcial de R$ 2.000 em renda fixa resulta em saldo de R$ 3.000 e quantity_e8 > 0 (elegível a alertas)', () => {
    const movements: MovementRecord[] = [
      {
        id: 'mov_buy_cdb',
        user_id: 'usr_1',
        account_id: 'acc_xp_1',
        asset_id: 'ast_cdb_xp',
        movement_type: 'buy',
        date: '2026-09-01T00:00:00.000Z',
        quantity_e8: 100000000, // 1 título na UI
        unit_price_cents: 500000,
        gross_amount_cents: 500000, // R$ 5.000,00
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 500000,
        is_reversed: false,
        created: '2026-09-01T10:00:00.000Z',
        updated: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'mov_sell_cdb',
        user_id: 'usr_1',
        account_id: 'acc_xp_1',
        asset_id: 'ast_cdb_xp',
        movement_type: 'sell',
        date: '2026-09-23T00:00:00.000Z',
        quantity_e8: 100000000, // 1 título na UI de resgate
        unit_price_cents: 200000,
        gross_amount_cents: 200000, // R$ 2.000,00
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 200000,
        is_reversed: false,
        created: '2026-09-23T15:00:00.000Z',
        updated: '2026-09-23T15:00:00.000Z',
      },
    ]

    const derived = derivePositionsFromMovements(movements, [mockAccount], [mockCdbAsset])

    expect(derived).toHaveLength(1)
    const pos = derived[0]
    expect(pos.asset_id).toBe('ast_cdb_xp')
    expect(pos.total_cost_cents).toBe(300000) // R$ 3.000,00
    expect(pos.average_price_cents).toBe(100) // R$ 1,00/unidade
    expect(pos.quantity_e8).toBe(300000000000) // 300.000.000.000 e8 = 3.000 unidades (R$ 3.000,00)
    expect(pos.quantity_e8).toBeGreaterThan(0) // Elegível para o motor de alertas (filtro quantity_e8 > 0)
    expect(pos.movementsCount).toBe(2)
  })

  it('2. Resgate total de Renda Fixa (venda do valor integral) zera a posição', () => {
    const movements: MovementRecord[] = [
      {
        id: 'mov_buy_cdb',
        user_id: 'usr_1',
        account_id: 'acc_xp_1',
        asset_id: 'ast_cdb_xp',
        movement_type: 'buy',
        date: '2026-09-01T00:00:00.000Z',
        quantity_e8: 100000000,
        unit_price_cents: 500000,
        gross_amount_cents: 500000,
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 500000,
        is_reversed: false,
        created: '2026-09-01T10:00:00.000Z',
        updated: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'mov_sell_cdb_total',
        user_id: 'usr_1',
        account_id: 'acc_xp_1',
        asset_id: 'ast_cdb_xp',
        movement_type: 'sell',
        date: '2026-09-23T00:00:00.000Z',
        quantity_e8: 100000000,
        unit_price_cents: 500000,
        gross_amount_cents: 500000,
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 500000,
        is_reversed: false,
        created: '2026-09-23T15:00:00.000Z',
        updated: '2026-09-23T15:00:00.000Z',
      },
    ]

    const derived = derivePositionsFromMovements(movements, [mockAccount], [mockCdbAsset])

    expect(derived).toHaveLength(0) // Posição zerada não aparece em posições ativas
  })

  it('3. Ativos cotizados (Ações) mantêm estritamente o cálculo por cotas e preço médio ponderado', () => {
    const movements: MovementRecord[] = [
      {
        id: 'mov_buy_petr4_1',
        user_id: 'usr_1',
        account_id: 'acc_xp_1',
        asset_id: 'ast_petr4',
        movement_type: 'buy',
        date: '2026-09-01T00:00:00.000Z',
        quantity_e8: 10000000000, // 100 ações
        unit_price_cents: 3000, // R$ 30,00
        gross_amount_cents: 300000,
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 300000,
        is_reversed: false,
        created: '2026-09-01T10:00:00.000Z',
        updated: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'mov_buy_petr4_2',
        user_id: 'usr_1',
        account_id: 'acc_xp_1',
        asset_id: 'ast_petr4',
        movement_type: 'buy',
        date: '2026-09-10T00:00:00.000Z',
        quantity_e8: 10000000000, // +100 ações
        unit_price_cents: 4000, // R$ 40,00
        gross_amount_cents: 400000,
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 400000,
        is_reversed: false,
        created: '2026-09-10T10:00:00.000Z',
        updated: '2026-09-10T10:00:00.000Z',
      },
      {
        id: 'mov_sell_petr4_partial',
        user_id: 'usr_1',
        account_id: 'acc_xp_1',
        asset_id: 'ast_petr4',
        movement_type: 'sell',
        date: '2026-09-15T00:00:00.000Z',
        quantity_e8: 5000000000, // Vende 50 ações
        unit_price_cents: 5000,
        gross_amount_cents: 250000,
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 250000,
        is_reversed: false,
        created: '2026-09-15T10:00:00.000Z',
        updated: '2026-09-15T10:00:00.000Z',
      },
    ]

    const derived = derivePositionsFromMovements(movements, [mockAccount], [mockStockAsset])

    expect(derived).toHaveLength(1)
    const pos = derived[0]
    expect(pos.quantity_e8).toBe(15000000000) // 150 ações restantes
    expect(pos.average_price_cents).toBe(3500) // Preço médio ponderado R$ 35,00
    expect(pos.total_cost_cents).toBe(525000) // R$ 5.250,00 (150 * 35)
  })
})
