import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import {
  BarChart3,
  Calculator,
  RefreshCw,
  Building2,
  ArrowRightLeft,
  CircleDollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { formatCurrencyBRL, formatDateBRL } from '@/lib/formatters'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAccountBalances, type AccountBalanceRecord } from '@/services/accountBalances'
import {
  listPositions,
  derivePositionsFromMovements,
  type PositionRecord,
  type DerivedPosition,
} from '@/services/positions'
import { listMovements, type MovementRecord } from '@/services/movements'
import { listAssets, type AssetRecord } from '@/services/assets'
import {
  listQuotes,
  refreshQuotes,
  getExchangeRateToBRL,
  getFxRate,
  type QuoteRecord,
} from '@/services/quotes'

export default function ConsolidationPage() {
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [accountBalances, setAccountBalances] = React.useState<AccountBalanceRecord[]>([])
  const [positions, setPositions] = React.useState<PositionRecord[]>([])
  const [derivedPositions, setDerivedPositions] = React.useState<DerivedPosition[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [, setMovements] = React.useState<MovementRecord[]>([])
  const [quotes, setQuotes] = React.useState<QuoteRecord[]>([])

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [accData, balData, posData, movData, assetData, quotesData] = await Promise.all([
        listAccounts(),
        listAccountBalances(),
        listPositions(),
        listMovements(),
        listAssets(),
        listQuotes(),
      ])

      setAccounts(accData)
      setAccountBalances(balData)
      setPositions(posData)
      setMovements(movData)
      setAssets(assetData)
      setQuotes(quotesData)

      const derived = derivePositionsFromMovements(movData, accData, assetData)
      setDerivedPositions(derived)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar dados consolidados.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefreshQuotes = async () => {
    try {
      setRefreshing(true)
      const res = await refreshQuotes()
      toast.success(
        res.updated_count > 0
          ? `Cotações e câmbio atualizados: ${res.updated_count} itens sincronizados.`
          : 'Cotações e câmbio verificados com sucesso.',
      )
      const newQuotes = await listQuotes()
      setQuotes(newQuotes)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Falha ao atualizar cotações com brapi.dev.')
    } finally {
      setRefreshing(false)
    }
  }

  // Câmbio atual obtido da brapi.dev
  const usdRate = React.useMemo(() => getFxRate('USD', 'BRL', quotes) ?? getExchangeRateToBRL(quotes, 'USD'), [quotes])
  const eurRate = React.useMemo(() => getFxRate('EUR', 'BRL', quotes) ?? getExchangeRateToBRL(quotes, 'EUR'), [quotes])

  // Data da cotação de câmbio
  const exchangeDate = React.useMemo(() => {
    const usdQuote = quotes.find((q) => {
      const t = q.ticker.toUpperCase()
      return t === 'USD-BRL' || t === 'USDBRL'
    })
    const eurQuote = quotes.find((q) => {
      const t = q.ticker.toUpperCase()
      return t === 'EUR-BRL' || t === 'EURBRL'
    })
    const d = usdQuote?.quoted_at || eurQuote?.quoted_at || usdQuote?.updated || eurQuote?.updated
    return d || null
  }, [quotes])

  // Consolidação de contas bancárias e de investimento
  const consolidatedAccounts = React.useMemo(() => {
    return accounts.map((acc) => {
      const bal = accountBalances.find((b) => b.account_id === acc.id)
      const curr = (acc.currency || bal?.currency || 'BRL').toUpperCase()
      const balanceCents = bal?.balance_cents || 0

      // Calcular conversão para BRL
      let rate = 1
      let convertedCents = balanceCents
      let hasRate = true

      if (curr === 'USD') {
        if (usdRate) {
          rate = usdRate
          convertedCents = Math.round(balanceCents * usdRate)
        } else {
          hasRate = false
        }
      } else if (curr === 'EUR') {
        if (eurRate) {
          rate = eurRate
          convertedCents = Math.round(balanceCents * eurRate)
        } else {
          hasRate = false
        }
      }

      return {
        id: acc.id,
        name: acc.name,
        currency: curr,
        balanceCents,
        convertedCents,
        rate,
        hasRate,
      }
    })
  }, [accounts, accountBalances, usdRate, eurRate])

  // Total de caixa consolidado em BRL
  const totalCashBrlCents = consolidatedAccounts.reduce((acc, a) => acc + a.convertedCents, 0)

  // Posições com valor em BRL
  const effectivePositions = React.useMemo(() => {
    const astMap = new Map<string, AssetRecord>(assets.map((a) => [a.id, a]))
    const accMap = new Map<string, AccountRecord>(accounts.map((a) => [a.id, a]))

    const list =
      positions.length > 0
        ? positions.map((p) => {
            const ast = p.expand?.asset_id || astMap.get(p.asset_id)
            const acc = p.expand?.account_id || accMap.get(p.account_id)
            const curr = (ast?.currency || acc?.currency || 'BRL').toUpperCase()
            const cost = p.total_cost_cents || 0
            return {
              id: p.id,
              ticker: ast?.ticker || 'Ativo',
              currency: curr,
              costCents: cost,
            }
          })
        : derivedPositions.map((dp) => {
            const curr = (dp.asset?.currency || dp.account?.currency || 'BRL').toUpperCase()
            return {
              id: dp.key,
              ticker: dp.asset?.ticker || 'Ativo',
              currency: curr,
              costCents: dp.total_cost_cents,
            }
          })

    return list.map((item) => {
      let rate = 1
      let convertedCents = item.costCents
      let hasRate = true

      if (item.currency === 'USD') {
        if (usdRate) {
          rate = usdRate
          convertedCents = Math.round(item.costCents * usdRate)
        } else {
          hasRate = false
        }
      } else if (item.currency === 'EUR') {
        if (eurRate) {
          rate = eurRate
          convertedCents = Math.round(item.costCents * eurRate)
        } else {
          hasRate = false
        }
      }

      return {
        ...item,
        rate,
        convertedCents,
        hasRate,
      }
    })
  }, [positions, derivedPositions, assets, accounts, usdRate, eurRate])

  const totalPositionsBrlCents = effectivePositions.reduce((acc, p) => acc + p.convertedCents, 0)
  const totalPatrimonyConsolidatedCents = totalCashBrlCents + totalPositionsBrlCents

  const hasAnyData = accounts.length > 0 || positions.length > 0 || derivedPositions.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidação Patrimonial"
        description="Visão unificada em Reais (BRL) convertendo contas internacionais (USD/EUR) com taxas de câmbio da brapi.dev."
        icon={BarChart3}
        breadcrumbs={[
          { label: 'Patrimônio', href: '/wealth/portfolios' },
          { label: 'Consolidação' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={handleRefreshQuotes}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando Câmbio...' : 'Atualizar Cotações'}
            </Button>
            <Button size="sm" className="h-9 text-xs">
              <Calculator className="h-3.5 w-3.5 mr-1" />
              Executar Fechamento Mensal
            </Button>
          </div>
        }
      />

      {/* Taxas de Câmbio de Referência */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Patrimônio Total Consolidado (BRL)
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-foreground">
              {formatCurrencyBRL(totalPatrimonyConsolidatedCents / 100)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Caixa convertido + ativos em custódia
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Câmbio Dólar (USD / BRL)
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {usdRate ? formatCurrencyBRL(usdRate) : 'R$ 5,00 (ref)'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {usdRate ? (
                <span>
                  Fonte: brapi.dev{' '}
                  {exchangeDate ? `• ${formatDateBRL(exchangeDate, { includeTime: true })}` : ''}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Sem cotação ativa (aguardando atualização)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Câmbio Euro (EUR / BRL)
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {eurRate ? formatCurrencyBRL(eurRate) : 'R$ 5,50 (ref)'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {eurRate ? (
                <span>
                  Fonte: brapi.dev{' '}
                  {exchangeDate ? `• ${formatDateBRL(exchangeDate, { includeTime: true })}` : ''}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Sem cotação ativa (aguardando atualização)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasAnyData && !loading ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhum patrimônio consolidado encontrado"
          description="A consolidação gera 'fotografias' oficiais do patrimônio e converte moedas estrangeiras para BRL com cotações de mercado."
          nextStepGuide="Após lançar suas contas, posições e saldos iniciais, utilize a consolidação para visão global."
          actionLabel="Ver Contas & Saldos"
          actionHref="/wealth/accounts"
        />
      ) : (
        /* Detalhamento de Contas e Conversões Cambiais */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Saldos em Conta e Conversão Cambial
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Contas internacionais são convertidas para BRL utilizando cotação oficial da brapi.dev
            </span>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Conta</th>
                    <th className="px-4 py-3">Moeda</th>
                    <th className="px-4 py-3 text-right">Saldo Original</th>
                    <th className="px-4 py-3 text-right">Taxa de Câmbio</th>
                    <th className="px-4 py-3 text-right">Saldo Convertido (BRL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {consolidatedAccounts.map((acc) => {
                    const balanceDecimal = acc.balanceCents / 100
                    const convertedDecimal = acc.convertedCents / 100

                    return (
                      <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{acc.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {acc.currency}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {acc.currency === 'USD'
                            ? `$ ${balanceDecimal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : acc.currency === 'EUR'
                              ? `€ ${balanceDecimal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : formatCurrencyBRL(balanceDecimal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {acc.currency === 'BRL' ? (
                            '1,0000 (paridade)'
                          ) : acc.hasRate ? (
                            <span>{acc.rate.toFixed(4).replace('.', ',')}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                              Sem câmbio (mantido)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatCurrencyBRL(convertedDecimal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-muted/30 border-t border-border font-medium text-foreground">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                      Total Consolidado em Caixa (BRL):
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyBRL(totalCashBrlCents / 100)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
