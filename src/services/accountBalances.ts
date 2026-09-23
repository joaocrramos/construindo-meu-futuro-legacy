import pb from '@/lib/pocketbase/client'
import type { AccountRecord } from './accounts'

export interface AccountBalanceRecord {
  id: string
  user_id: string
  account_id: string
  currency: string
  balance_cents: number
  last_movement_id?: string
  last_recalculated_at: string
  created: string
  updated: string
  expand?: {
    account_id?: AccountRecord
  }
}

/**
 * Lista os saldos em conta (caixa disponível) do usuário autenticado.
 */
export async function listAccountBalances(): Promise<AccountBalanceRecord[]> {
  try {
    const records = await pb.collection('account_balances').getFullList<AccountBalanceRecord>({
      sort: '-balance_cents',
      expand: 'account_id',
    })
    return records
  } catch {
    return []
  }
}
