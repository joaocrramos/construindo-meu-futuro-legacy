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
  date: string
  quantity_e8?: number
  unit_price_cents?: number
  gross_amount_cents: number
  fees_cents: number
  taxes_cents: number
  net_amount_cents: number
  idempotency_key?: string
  is_reversed?: boolean
  notes?: string
  created: string
  updated: string
  reversal_of_id?: string
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
  idempotency_key?: string
  notes?: string
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
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as {
      response?: { data?: Record<string, { message?: string; code?: string }>; message?: string }
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
  }

  const strErr = String(error)
  if (strErr.includes('idx_movements_user_idempotency') || strErr.includes('idempotency_key')) {
    return 'Esta movimentação já foi registrada anteriormente (chave de idempotência duplicada).'
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

  const fees = payload.fees_cents || 0
  const taxes = payload.taxes_cents || 0
  const gross = payload.gross_amount_cents || 0
  const calculatedNet =
    payload.net_amount_cents !== undefined ? payload.net_amount_cents : gross - fees - taxes

  try {
    const record = await pb.collection('movements').create<MovementRecord>(
      {
        ...payload,
        user_id: userId,
        fees_cents: fees,
        taxes_cents: taxes,
        net_amount_cents: calculatedNet,
        is_reversed: false,
      },
      {
        expand: 'account_id,asset_id',
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
