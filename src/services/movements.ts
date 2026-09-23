import pb from '@/lib/pocketbase/client'
import type { AccountRecord } from './accounts'
import type { AssetRecord } from './assets'

export type MovementType =
  | 'deposit'
  | 'withdrawal'
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest_on_capital'
  | 'amortization'
  | 'fee'
  | 'tax'
  | 'reversal'

export interface MovementRecord {
  id: string
  user_id: string
  account_id: string
  asset_id?: string
  movement_type: MovementType
  date: string // ISO date string
  quantity_e8?: number
  unit_price_cents?: number
  gross_amount_cents: number
  fees_cents: number
  taxes_cents: number
  net_amount_cents: number
  due_date?: string
  indexer_rate?: string
  idempotency_key?: string
  is_reversed?: boolean
  reversal_of_id?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    account_id?: AccountRecord
    asset_id?: AssetRecord
  }
}

export interface CreateMovementPayload {
  account_id: string
  asset_id?: string
  movement_type: MovementType
  date: string // ISO string ou YYYY-MM-DD
  quantity_e8?: number
  unit_price_cents?: number
  gross_amount_cents: number
  fees_cents?: number
  taxes_cents?: number
  net_amount_cents?: number
  due_date?: string
  indexer_rate?: string
  idempotency_key?: string
  notes?: string
}

export interface UpdateMovementPayload {
  account_id?: string
  asset_id?: string | null
  movement_type?: MovementType
  date?: string
  quantity_e8?: number
  unit_price_cents?: number
  gross_amount_cents?: number
  fees_cents?: number
  taxes_cents?: number
  net_amount_cents?: number
  due_date?: string | null
  indexer_rate?: string | null
  notes?: string | null
}
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  deposit: 'Aporte / Depósito',
  withdrawal: 'Resgate / Saque',
  buy: 'Compra de Ativo',
  sell: 'Venda de Ativo',
  dividend: 'Dividendo',
  interest_on_capital: 'Juros sobre Capital Próprio (JCP)',
  amortization: 'Amortização',
  fee: 'Taxa / Custódia / Corretagem',
  tax: 'Imposto (IR / IOF)',
  reversal: 'Estorno / Cancelamento',
}

/**
 * Movimentações que exigem obrigatoriamente ativo associado e quantidade.
 */
export const ASSET_REQUIRED_MOVEMENTS: MovementType[] = [
  'buy',
  'sell',
  'dividend',
  'interest_on_capital',
  'amortization',
]

/**
 * Converte valor decimal de quantidade para escala e8 inteira (10^8).
 * Exemplo: 1.5 -> 150000000
 */
export function decimalToE8(decimalValue: number | string | null | undefined): number {
  if (decimalValue === null || decimalValue === undefined || decimalValue === '') return 0
  const normalized =
    typeof decimalValue === 'string'
      ? decimalValue.replace(/\./g, '').replace(',', '.')
      : decimalValue
  const num = Number(normalized)
  if (Number.isNaN(num)) return 0
  return Math.round(num * 100000000)
}

/**
 * Converte quantidade na escala e8 para decimal numérico.
 */
export function e8ToDecimal(e8: number | null | undefined): number {
  if (!e8) return 0
  return e8 / 100000000
}

/**
 * Formata quantidade e8 com número adequado de decimais em pt-BR.
 */
export function formatQuantityE8(e8: number | null | undefined, maxDecimals = 8): string {
  if (e8 === null || e8 === undefined) return '0'
  const decimal = e8ToDecimal(e8)
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(decimal)
}

/**
 * Converte valor em reais (decimal) para centavos inteiros.
 */
export function brlToCents(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0
  let str = String(val)
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s+/g, '')
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.includes(',')) {
    str = str.replace(',', '.')
  }
  const parsed = Number.parseFloat(str)
  if (Number.isNaN(parsed)) return 0
  return Math.round(parsed * 100)
}

/**
 * Converte centavos inteiros para número decimal.
 */
export function centsToBrl(cents: number | null | undefined): number {
  if (!cents) return 0
  return cents / 100
}

/**
 * Traduz erros do PocketBase referentes a movements para mensagens amigáveis em português.
 */
export function translateMovementError(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as {
      message?: string
      response?: {
        message?: string
        code?: string
        data?: Record<string, { message?: string; code?: string }>
      }
      status?: number
    }

    const responseMsg = err.response?.message
    if (responseMsg) {
      return responseMsg
    }

    const data = err.response?.data
    if (data?.idempotency_key) {
      return 'Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).'
    }
    if (data?.account_id) {
      return 'Por favor, selecione uma conta válida.'
    }
    if (data?.gross_amount_cents) {
      return 'O valor bruto da movimentação é obrigatório.'
    }

    if (
      err.message &&
      !err.message.includes('ClientResponseError') &&
      !err.message.includes('status: 400')
    ) {
      return err.message
    }
  }

  const strErr = String(error)
  if (
    strErr.includes('idx_movements_user_idempotency') ||
    strErr.includes('DUPLICATE_IDEMPOTENCY_KEY') ||
    strErr.includes('idempotency_key')
  ) {
    return 'Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).'
  }
  if (strErr.includes('Saldo insuficiente na conta.') || strErr.includes('INSUFFICIENT_FUNDS')) {
    return 'Saldo insuficiente na conta.'
  }
  if (strErr.includes('NET_AMOUNT_MISMATCH')) {
    return 'Divergência no valor líquido: o valor líquido deve ser igual ao valor bruto menos taxas e impostos.'
  }
  if (strErr.includes('MOVEMENT_REVERSED')) {
    return 'Não é possível editar uma movimentação que já foi estornada.'
  }

  return 'Ocorreu um erro ao registrar a movimentação. Tente novamente.'
}

/**
 * Lista movimentações do usuário autenticado.
 */
export async function listMovements(): Promise<MovementRecord[]> {
  const records = await pb.collection('movements').getFullList<MovementRecord>({
    sort: '-date,-created',
    expand: 'account_id,asset_id',
  })
  return records
}

/**
 * Cria uma movimentação financeira no livro-razão.
 */
export async function createMovement(payload: CreateMovementPayload): Promise<MovementRecord> {
  const userId = pb.authStore.record?.id
  if (!userId) {
    throw new Error('Usuário não autenticado.')
  }

  const fees =
    payload.fees_cents !== undefined && payload.fees_cents !== null ? payload.fees_cents : 0
  const taxes =
    payload.taxes_cents !== undefined && payload.taxes_cents !== null ? payload.taxes_cents : 0
  const gross =
    payload.gross_amount_cents !== undefined && payload.gross_amount_cents !== null
      ? payload.gross_amount_cents
      : 0
  const isBuy = payload.movement_type === 'buy'
  const expectedNet = isBuy ? gross + fees : gross - fees - taxes
  const calculatedNet =
    payload.net_amount_cents !== undefined && payload.net_amount_cents !== null
      ? payload.net_amount_cents
      : expectedNet

  if (calculatedNet !== expectedNet) {
    throw new Error(
      isBuy
        ? 'Divergência no valor líquido: na compra de ativo, o valor líquido deve ser igual ao valor bruto mais taxas/emolumentos.'
        : 'Divergência no valor líquido: o valor líquido deve ser igual ao valor bruto menos taxas e impostos.',
    )
  }

  try {
    const record = await pb.send<MovementRecord>('/backend/v1/movements', {
      method: 'POST',
      body: {
        account_id: payload.account_id,
        asset_id: payload.asset_id,
        movement_type: payload.movement_type,
        date: payload.date,
        quantity_e8: payload.quantity_e8,
        unit_price_cents: payload.unit_price_cents,
        gross_amount_cents: gross,
        fees_cents: fees,
        taxes_cents: taxes,
        net_amount_cents: calculatedNet,
        due_date: payload.due_date,
        indexer_rate: payload.indexer_rate,
        idempotency_key: payload.idempotency_key,
        notes: payload.notes,
      },
    })
    return record
  } catch (err) {
    const userFriendlyMsg = translateMovementError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}

/**
 * Atualiza uma movimentação financeira existente via hook server-side e recalcula saldos e posições.
 */
export async function updateMovement(
  id: string,
  payload: UpdateMovementPayload,
): Promise<MovementRecord> {
  const userId = pb.authStore.record?.id
  if (!userId) {
    throw new Error('Usuário não autenticado.')
  }

  if (payload.gross_amount_cents !== undefined && payload.movement_type) {
    const fees =
      payload.fees_cents !== undefined && payload.fees_cents !== null ? payload.fees_cents : 0
    const taxes =
      payload.taxes_cents !== undefined && payload.taxes_cents !== null ? payload.taxes_cents : 0
    const gross = payload.gross_amount_cents
    const isBuy = payload.movement_type === 'buy'
    const expectedNet = isBuy ? gross + fees : gross - fees - taxes

    if (
      payload.net_amount_cents !== undefined &&
      payload.net_amount_cents !== null &&
      payload.net_amount_cents !== expectedNet
    ) {
      throw new Error(
        isBuy
          ? 'Divergência no valor líquido: na compra de ativo, o valor líquido deve ser igual ao valor bruto mais taxas/emolumentos.'
          : 'Divergência no valor líquido: o valor líquido deve ser igual ao valor bruto menos taxas e impostos.',
      )
    }
  }

  try {
    const record = await pb.send<MovementRecord>(
      `/backend/v1/movements/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: {
          account_id: payload.account_id,
          asset_id: payload.asset_id,
          movement_type: payload.movement_type,
          date: payload.date,
          quantity_e8: payload.quantity_e8,
          unit_price_cents: payload.unit_price_cents,
          gross_amount_cents: payload.gross_amount_cents,
          fees_cents: payload.fees_cents,
          taxes_cents: payload.taxes_cents,
          net_amount_cents: payload.net_amount_cents,
          due_date: payload.due_date,
          indexer_rate: payload.indexer_rate,
          notes: payload.notes,
        },
      },
    )
    return record
  } catch (err) {
    const userFriendlyMsg = translateMovementError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}
