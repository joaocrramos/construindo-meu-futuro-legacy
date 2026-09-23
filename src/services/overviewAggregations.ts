import type { AccountBalanceRecord } from '@/services/accountBalances'
import type { PositionRecord, DerivedPosition } from '@/services/positions'
import type { MovementRecord } from '@/services/movements'
import type { AssetRecord } from '@/services/assets'
import type { AccountRecord } from '@/services/accounts'

export interface CurrencySummary {
  currency: string
  cashCents: number
  investedCostCents: number
  totalCostCents: number
  positionsCount: number
  accountsCount: number
}

export interface ConsolidatedOverviewMetrics {
  totalCashBrlCents: number
  totalInvestedCostBrlCents: number
  totalPatrimonyBrlCents: number
  hasNonBrlCurrencies: boolean
  currencySummaries: CurrencySummary[]
  activePositionsCount: number
  activeAccountsCount: number
  activeAssetsCount: number
  distinctAssetClassesCount: number
  totalMovementsCount: number
  nextMaturityDate: string | null
  nextMaturityAssetTicker: string | null
  hasAnyData: boolean
}

/**
 * Computa métricas patrimoniais consolidadas a partir das bases do usuário.
 * Isola moedas estritamente: não soma BRL com USD ou EUR sem cotação de mercado.
 */
export function calculateConsolidatedOverview(params: {
  accountBalances: AccountBalanceRecord[]
  positions: PositionRecord[]
  derivedPositions: DerivedPosition[]
  accounts: AccountRecord[]
  assets: AssetRecord[]
  movements: MovementRecord[]
}): ConsolidatedOverviewMetrics {
  const { accountBalances, positions, derivedPositions, accounts, assets, movements } = params

  const accountMap = new Map<string, AccountRecord>(accounts.map((a) => [a.id, a]))
  const assetMap = new Map<string, AssetRecord>(assets.map((a) => [a.id, a]))

  const useDbPositions = positions.length > 0
  const effectivePositions: Array<{
    accountId: string
    assetId: string
    totalCostCents: number
    quantityE8: number
    maturityDate?: string | null
    currency: string
  }> = []

  if (useDbPositions) {
    for (const p of positions) {
      if (p.quantity_e8 <= 0) continue
      const acc = p.expand?.account_id || accountMap.get(p.account_id)
      const ast = p.expand?.asset_id || assetMap.get(p.asset_id)
      const curr = (ast?.currency || acc?.currency || 'BRL').toUpperCase()
      effectivePositions.push({
        accountId: p.account_id,
        assetId: p.asset_id,
        totalCostCents: p.total_cost_cents || 0,
        quantityE8: p.quantity_e8,
        maturityDate: p.maturity_date || null,
        currency: curr,
      })
    }
  } else {
    for (const dp of derivedPositions) {
      if (dp.quantity_e8 <= 0) continue
      const curr = (dp.asset?.currency || dp.account?.currency || 'BRL').toUpperCase()
      effectivePositions.push({
        accountId: dp.account_id,
        assetId: dp.asset_id,
        totalCostCents: dp.total_cost_cents || 0,
        quantityE8: dp.quantity_e8,
        maturityDate: null,
        currency: curr,
      })
    }
  }

  // Mapeamento por moeda
  const currenciesSet = new Set<string>()
  accountBalances.forEach((b) => currenciesSet.add((b.currency || 'BRL').toUpperCase()))
  effectivePositions.forEach((p) => currenciesSet.add(p.currency))
  if (currenciesSet.size === 0) {
    currenciesSet.add('BRL')
  }

  const summaries: CurrencySummary[] = []
  for (const curr of Array.from(currenciesSet).sort()) {
    const cashCents = accountBalances
      .filter((b) => (b.currency || 'BRL').toUpperCase() === curr)
      .reduce((sum, b) => sum + (b.balance_cents || 0), 0)

    const posInCurr = effectivePositions.filter((p) => p.currency === curr)
    const investedCostCents = posInCurr.reduce((sum, p) => sum + p.totalCostCents, 0)
    const distinctAccs = new Set(posInCurr.map((p) => p.accountId))

    summaries.push({
      currency: curr,
      cashCents,
      investedCostCents,
      totalCostCents: cashCents + investedCostCents,
      positionsCount: posInCurr.length,
      accountsCount: distinctAccs.size,
    })
  }

  const brlSummary = summaries.find((s) => s.currency === 'BRL')
  const totalCashBrlCents = brlSummary ? brlSummary.cashCents : 0
  const totalInvestedCostBrlCents = brlSummary ? brlSummary.investedCostCents : 0
  const totalPatrimonyBrlCents = totalCashBrlCents + totalInvestedCostBrlCents

  const nonBrlSummaries = summaries.filter((s) => s.currency !== 'BRL')
  const hasNonBrlCurrencies = nonBrlSummaries.some(
    (s) => s.cashCents !== 0 || s.investedCostCents !== 0,
  )

  // Classes de ativos distintas em custódia
  const distinctClasses = new Set<string>()
  for (const pos of effectivePositions) {
    const ast = assetMap.get(pos.assetId)
    if (ast?.asset_class) {
      distinctClasses.add(ast.asset_class)
    }
  }

  // Próximo vencimento (apenas posições com maturity_date futura)
  let nextMaturityDate: string | null = null
  let nextMaturityAssetTicker: string | null = null
  const nowStr = new Date().toISOString().slice(0, 10)

  const upcomingMaturities = effectivePositions
    .filter((p) => p.maturityDate && p.maturityDate >= nowStr)
    .sort((a, b) => (a.maturityDate || '').localeCompare(b.maturityDate || ''))

  if (upcomingMaturities.length > 0) {
    nextMaturityDate = upcomingMaturities[0].maturityDate || null
    const ast = assetMap.get(upcomingMaturities[0].assetId)
    nextMaturityAssetTicker = ast?.ticker || null
  }

  const hasAnyData =
    accountBalances.length > 0 ||
    effectivePositions.length > 0 ||
    movements.length > 0 ||
    accounts.length > 0 ||
    assets.length > 0

  return {
    totalCashBrlCents,
    totalInvestedCostBrlCents,
    totalPatrimonyBrlCents,
    hasNonBrlCurrencies,
    currencySummaries: summaries,
    activePositionsCount: effectivePositions.length,
    activeAccountsCount: accounts.length,
    activeAssetsCount: assets.length,
    distinctAssetClassesCount: distinctClasses.size,
    totalMovementsCount: movements.length,
    nextMaturityDate,
    nextMaturityAssetTicker,
    hasAnyData,
  }
}
