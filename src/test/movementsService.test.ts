import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import {
  createMovement,
  translateMovementError,
  type CreateMovementPayload,
} from '@/services/movements'

vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      authStore: {
        record: { id: 'usr_mock_123' },
      },
      send: vi.fn(),
      collection: vi.fn(() => ({
        getFullList: vi.fn(),
        create: vi.fn(),
      })),
    },
  }
})

describe('movements service - createMovement e validações', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Define usuário autenticado no authStore por padrão
    // @ts-expect-error mock authStore record
    pb.authStore = { record: { id: 'usr_mock_123' } }
  })

  it('1. Rejeita imediatamente quando o usuário não está autenticado', async () => {
    // @ts-expect-error mock unauthenticated authStore
    pb.authStore = { record: null }

    const payload: CreateMovementPayload = {
      account_id: 'acc_1',
      movement_type: 'deposit',
      date: '2026-03-24',
      gross_amount_cents: 10000,
    }

    await expect(createMovement(payload)).rejects.toThrow('Usuário não autenticado.')
    expect(pb.send).not.toHaveBeenCalled()
  })

  it('2. Valida cálculo do valor líquido e rejeita divergência antes de chamar o backend', async () => {
    const payload: CreateMovementPayload = {
      account_id: 'acc_1',
      movement_type: 'buy',
      date: '2026-03-24',
      gross_amount_cents: 10000,
      fees_cents: 200,
      taxes_cents: 0,
      // Na compra, o líquido correto seria 10200 (10000 + 200). 9999 deve divergir
      net_amount_cents: 9999,
    }

    await expect(createMovement(payload)).rejects.toThrow(
      'Divergência no valor líquido: na compra de ativo, o valor líquido deve ser igual ao valor bruto mais taxas/emolumentos.',
    )
    expect(pb.send).not.toHaveBeenCalled()
  })

  it('3. Calcula líquido automaticamente e envia para /backend/v1/movements quando válido', async () => {
    const expectedResponse = {
      id: 'mov_created_1',
      user_id: 'usr_mock_123',
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'buy',
      date: '2026-03-24',
      quantity_e8: 10000000000,
      unit_price_cents: 3550,
      gross_amount_cents: 355000,
      fees_cents: 500,
      taxes_cents: 0,
      net_amount_cents: 355500,
      created: '2026-03-24T12:00:00Z',
      updated: '2026-03-24T12:00:00Z',
    }

    vi.mocked(pb.send).mockResolvedValueOnce(expectedResponse)

    const payload: CreateMovementPayload = {
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'buy',
      date: '2026-03-24',
      quantity_e8: 10000000000,
      unit_price_cents: 3550,
      gross_amount_cents: 355000,
      fees_cents: 500,
      taxes_cents: 0,
    }

    const result = await createMovement(payload)

    expect(pb.send).toHaveBeenCalledTimes(1)
    expect(pb.send).toHaveBeenCalledWith('/backend/v1/movements', {
      method: 'POST',
      body: {
        account_id: 'acc_1',
        asset_id: 'ast_1',
        movement_type: 'buy',
        date: '2026-03-24',
        quantity_e8: 10000000000,
        unit_price_cents: 3550,
        gross_amount_cents: 355000,
        fees_cents: 500,
        taxes_cents: 0,
        net_amount_cents: 355500,
        idempotency_key: undefined,
        notes: undefined,
      },
    })
    expect(result).toEqual(expectedResponse)
  })

  it('4. Traduz erro de chave de idempotência duplicada para mensagem amigável', async () => {
    vi.mocked(pb.send).mockRejectedValueOnce({
      response: {
        message:
          'Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).',
        code: 'DUPLICATE_IDEMPOTENCY_KEY',
      },
      status: 409,
    })

    const payload: CreateMovementPayload = {
      account_id: 'acc_1',
      movement_type: 'deposit',
      date: '2026-03-24',
      gross_amount_cents: 5000,
      idempotency_key: 'ORD-DUP-01',
    }

    await expect(createMovement(payload)).rejects.toThrow(
      'Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).',
    )
  })

  it('5. Traduz mensagens de validação retornadas pelo endpoint', async () => {
    vi.mocked(pb.send).mockRejectedValueOnce({
      response: {
        message: 'A conta informada não pertence ao usuário autenticado.',
        code: 'ACCOUNT_NOT_OWNED',
      },
      status: 400,
    })

    const payload: CreateMovementPayload = {
      account_id: 'acc_other_user',
      movement_type: 'deposit',
      date: '2026-03-24',
      gross_amount_cents: 5000,
    }

    await expect(createMovement(payload)).rejects.toThrow(
      'A conta informada não pertence ao usuário autenticado.',
    )
  })

  it('6. translateMovementError lida com diferentes formatos de exceção', () => {
    expect(
      translateMovementError({
        response: {
          data: {
            idempotency_key: { message: 'Unique constraint failed' },
          },
        },
      }),
    ).toBe('Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).')

    expect(
      translateMovementError({
        response: {
          data: {
            account_id: { message: 'Cannot be blank' },
          },
        },
      }),
    ).toBe('Por favor, selecione uma conta válida.')

    expect(
      translateMovementError({
        response: {
          data: {
            gross_amount_cents: { message: 'Cannot be blank' },
          },
        },
      }),
    ).toBe('O valor bruto da movimentação é obrigatório.')

    expect(
      translateMovementError('Error: UNIQUE constraint failed: idx_movements_user_idempotency'),
    ).toBe('Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).')

    expect(translateMovementError(new Error('Unknown error'))).toBe('Unknown error')
  })

  it('7. fees_cents=0 e taxes_cents=0 são explicitamente aceitos e enviados ao endpoint', async () => {
    const expectedResponse = {
      id: 'mov_zero_fees_taxes_1',
      user_id: 'usr_mock_123',
      account_id: 'acc_1',
      movement_type: 'deposit',
      date: '2026-03-24',
      quantity_e8: 0,
      unit_price_cents: 0,
      gross_amount_cents: 50000,
      fees_cents: 0,
      taxes_cents: 0,
      net_amount_cents: 50000,
      created: '2026-03-24T12:00:00Z',
      updated: '2026-03-24T12:00:00Z',
    }

    vi.mocked(pb.send).mockResolvedValueOnce(expectedResponse)

    const payload: CreateMovementPayload = {
      account_id: 'acc_1',
      movement_type: 'deposit',
      date: '2026-03-24',
      gross_amount_cents: 50000,
      fees_cents: 0,
      taxes_cents: 0,
      net_amount_cents: 50000,
    }

    const result = await createMovement(payload)

    expect(pb.send).toHaveBeenCalledTimes(1)
    expect(pb.send).toHaveBeenCalledWith('/backend/v1/movements', {
      method: 'POST',
      body: {
        account_id: 'acc_1',
        asset_id: undefined,
        movement_type: 'deposit',
        date: '2026-03-24',
        quantity_e8: undefined,
        unit_price_cents: undefined,
        gross_amount_cents: 50000,
        fees_cents: 0,
        taxes_cents: 0,
        net_amount_cents: 50000,
        idempotency_key: undefined,
        notes: undefined,
      },
    })
    expect(result.fees_cents).toBe(0)
    expect(result.taxes_cents).toBe(0)
    expect(result.net_amount_cents).toBe(50000)
    expect(result).toEqual(expectedResponse)
  })

  it('8. Compra de ativo: soma emolumentos e liquidação em fees_cents com taxes_cents=0 e calcula líquido (bruto + custos)', async () => {
    // Cenário: compra de R$ 10.000,00 com R$ 15,00 de emolumentos e R$ 25,00 de liquidação (total fees = R$ 40,00, taxes = 0)
    const grossCents = 1000000 // R$ 10.000,00
    const emolumentosCents = 1500 // R$ 15,00
    const liquidacaoCents = 2500 // R$ 25,00
    const feesCents = emolumentosCents + liquidacaoCents // 4000 (R$ 40,00)
    const taxesCents = 0 // Compra não tem IR
    const netCents = grossCents + feesCents // 1004000 (os custos somam no valor de aquisição)

    const mockResponse = {
      id: 'mov_buy_1',
      user_id: 'usr_mock_123',
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'buy' as const,
      date: '2026-03-24',
      quantity_e8: 10000000000,
      unit_price_cents: 10000,
      gross_amount_cents: grossCents,
      fees_cents: feesCents,
      taxes_cents: taxesCents,
      net_amount_cents: netCents,
      created: '2026-03-24T12:00:00Z',
      updated: '2026-03-24T12:00:00Z',
    }

    vi.mocked(pb.send).mockResolvedValueOnce(mockResponse)

    const payload: CreateMovementPayload = {
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'buy',
      date: '2026-03-24',
      quantity_e8: 10000000000,
      unit_price_cents: 10000,
      gross_amount_cents: grossCents,
      fees_cents: feesCents,
      taxes_cents: taxesCents,
      net_amount_cents: netCents,
    }

    const result = await createMovement(payload)

    expect(pb.send).toHaveBeenCalledWith('/backend/v1/movements', {
      method: 'POST',
      body: expect.objectContaining({
        movement_type: 'buy',
        gross_amount_cents: 1000000,
        fees_cents: 4000,
        taxes_cents: 0,
        net_amount_cents: 1004000,
      }),
    })
    expect(result.taxes_cents).toBe(0)
    expect(result.fees_cents).toBe(4000)
    expect(result.net_amount_cents).toBe(1004000)
  })

  it('9. Venda de ativo: envia emolumentos + liquidação em fees_cents, IR em taxes_cents e calcula líquido', async () => {
    // Cenário: venda de R$ 20.000,00 com emolumentos R$ 30, liquidação R$ 50 (fees = R$ 80) e IR R$ 300 (taxes = R$ 300)
    const grossCents = 2000000 // R$ 20.000,00
    const emolumentosCents = 3000 // R$ 30,00
    const liquidacaoCents = 5000 // R$ 50,00
    const feesCents = emolumentosCents + liquidacaoCents // 8000 (R$ 80,00)
    const taxesCents = 30000 // R$ 300,00 (IR)
    const netCents = grossCents - feesCents - taxesCents // 2000000 - 8000 - 30000 = 1962000

    const mockResponse = {
      id: 'mov_sell_1',
      user_id: 'usr_mock_123',
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'sell' as const,
      date: '2026-03-24',
      quantity_e8: 10000000000,
      unit_price_cents: 20000,
      gross_amount_cents: grossCents,
      fees_cents: feesCents,
      taxes_cents: taxesCents,
      net_amount_cents: netCents,
      created: '2026-03-24T12:00:00Z',
      updated: '2026-03-24T12:00:00Z',
    }

    vi.mocked(pb.send).mockResolvedValueOnce(mockResponse)

    const payload: CreateMovementPayload = {
      account_id: 'acc_1',
      asset_id: 'ast_1',
      movement_type: 'sell',
      date: '2026-03-24',
      quantity_e8: 10000000000,
      unit_price_cents: 20000,
      gross_amount_cents: grossCents,
      fees_cents: feesCents,
      taxes_cents: taxesCents,
      net_amount_cents: netCents,
    }

    const result = await createMovement(payload)

    expect(pb.send).toHaveBeenCalledWith('/backend/v1/movements', {
      method: 'POST',
      body: expect.objectContaining({
        movement_type: 'sell',
        gross_amount_cents: 2000000,
        fees_cents: 8000,
        taxes_cents: 30000,
        net_amount_cents: 1962000,
      }),
    })
    expect(result.fees_cents).toBe(8000)
    expect(result.taxes_cents).toBe(30000)
    expect(result.net_amount_cents).toBe(1962000)
  })
})
