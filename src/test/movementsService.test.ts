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
      taxes_cents: 300,
      // Líquido correto seria 9500 (10000 - 200 - 300)
      net_amount_cents: 9999,
    }

    await expect(createMovement(payload)).rejects.toThrow(
      'Divergência no valor líquido: o valor líquido deve ser igual ao valor bruto menos taxas e impostos.',
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
      net_amount_cents: 354500,
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
        net_amount_cents: 354500,
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
})
