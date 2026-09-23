import pb from '@/lib/pocketbase/client'
import type { AccountRecord } from './accounts'
import type { AssetRecord } from './assets'
import type { MovementRecord } from './movements'
import { e8ToDecimal } from './movements'

export interface PositionRecord {
  id: string
  user_id: string
  account_id: string
  asset_id: string
  quantity_e8: number
  average_price_cents: number
  total_cost_cents: number
  current_price_cents?: number
  total_market_value_cents?: number
  maturity_date?: string
  indexer?: string
  notes?: string
  last_recalculated_at: string
  created: string
  updated: string
  expand?: {
    account_id?: AccountRecord
    asset_id?: AssetRecord
  }
}

/**
 * Posição computada a partir das movimentações históricas (quando positions não possui registros prévios).
 */
export interface DerivedPosition {
  key: string
  account_id: string
  asset_id: string
  account?: AccountRecord
  asset?: AssetRecord
  quantity_e8: number
  average_price_cents: number
  total_cost_cents: number
  movementsCount: number
}

/**
 * Lista posições cadastradas no PocketBase (somente leitura conforme RLS).
 */
export async function listPositions(): Promise<PositionRecord[]> {
  try {
    const records = await pb.collection('positions').getFullList<PositionRecord>({
      sort: '-updated',
      expand: 'account_id,asset_id',
    })
    return records
  } catch (err) {
    console.error('Falha ao listar posições:', err)
    return []
  }
}

/**
 * Deriva posições a partir do histórico de movimentações (compras e vendas)
 * aplicando o algoritmo contábil de Preço Médio Ponderado.
 */
export function derivePositionsFromMovements(
  movements: MovementRecord[],
  accounts: AccountRecord[] = [],
  assets: AssetRecord[] = [],
): DerivedPosition[] {
  const accountMap = new Map<string, AccountRecord>(accounts.map((a) => [a.id, a]))
  const assetMap = new Map<string, AssetRecord>(assets.map((a) => [a.id, a]))

  // Ordena por data cronológica crescente para cálculo do preço médio
  const sorted = [...movements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const positionsMap = new Map<
    string,
    {
      account_id: string
      asset_id: string
      quantity_e8: number
      total_cost_cents: number
      average_price_cents: number
      movementsCount: number
    }
  >()

  for (const mov of sorted) {
    if (!mov.asset_id || !mov.account_id || !mov.quantity_e8 || mov.is_reversed) {
      continue
    }

    const key = `${mov.account_id}_${mov.asset_id}`
    let current = positionsMap.get(key)
    if (!current) {
      current = {
        account_id: mov.account_id,
        asset_id: mov.asset_id,
        quantity_e8: 0,
        total_cost_cents: 0,
        average_price_cents: 0,
        movementsCount: 0,
      }
      positionsMap.set(key, current)
    }

    current.movementsCount += 1

    if (mov.movement_type === 'buy') {
      const addedQty = mov.quantity_e8
      // Custo da compra = líquido gasto ou (unitário * quantidade)
      const addedCost =
        mov.net_amount_cents > 0
          ? mov.net_amount_cents
          : (mov.unit_price_cents || 0) * e8ToDecimal(addedQty)

      const newQty = current.quantity_e8 + addedQty
      const newCost = current.total_cost_cents + Math.round(addedCost)
      const newAvgPrice = newQty > 0 ? Math.round(newCost / e8ToDecimal(newQty)) : 0

      current.quantity_e8 = newQty
      current.total_cost_cents = newCost
      current.average_price_cents = newAvgPrice
    } else if (mov.movement_type === 'sell') {
      const soldQty = Math.min(mov.quantity_e8, current.quantity_e8)
      const remainingQty = current.quantity_e8 - soldQty
      // Na venda, o preço médio se mantém, e o custo total diminui proporcionalmente
      const remainingCost =
        remainingQty > 0 ? Math.round(current.average_price_cents * e8ToDecimal(remainingQty)) : 0

      current.quantity_e8 = remainingQty
      current.total_cost_cents = remainingCost
      if (remainingQty === 0) {
        current.average_price_cents = 0
      }
    }
  }

  const result: DerivedPosition[] = []
  for (const [key, pos] of positionsMap.entries()) {
    if (pos.quantity_e8 > 0) {
      result.push({
        key,
        account_id: pos.account_id,
        asset_id: pos.asset_id,
        account: accountMap.get(pos.account_id),
        asset: assetMap.get(pos.asset_id),
        quantity_e8: pos.quantity_e8,
        average_price_cents: pos.average_price_cents,
        total_cost_cents: pos.total_cost_cents,
        movementsCount: pos.movementsCount,
      })
    }
  }

  return result
}
