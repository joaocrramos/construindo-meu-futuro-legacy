import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyBRL } from '@/lib/formatters'
import {
  Wallet,
  Coins,
  Building2,
  TrendingUp,
  ArrowUpDown,
  Plus,
  Loader2,
  AlertCircle,
  PiggyBank,
  CircleDot,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { listAccountBalances, type AccountBalanceRecord } from '@/services/accountBalances'
import {
  listPositions,
  derivePositionsFromMovements,
  type PositionRecord,
  type DerivedPosition,
} from '@/services/positions'
import { listMovements, type MovementRecord } from '@/services/movements'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAssets, type AssetRecord } from '@/services/assets'
import {
  calculateConsolidatedOverview,
  type ConsolidatedOverviewMetrics,
} from '@/services/overviewAggregations'
import { toast } from 'sonner'

export default function SummaryPage() {
  const [loading, setLoading] = React.useState(true)
  const [accountBalances, setAccountBalances] = React.useState<AccountBalanceRecord[]>([])
  const [positions, setPositions] = React.useState<PositionRecord[]>([])
  const [derivedPositions, setDerivedPositions] = React.useState<DerivedPosition[]>([])
  const [movements, setMovements] = React.useState<MovementRecord[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [balData, posData, movData, accData, assetData] = await Promise.all([
        listAccountBalances(),
        listPositions(),
        listMovements(),
        listAccounts(),
        listAssets(),
      ])

      setAccountBalances(balData)
      setPositions(posData)
      setMovements(movData)
      setAccounts(accData)
      setAssets(assetData)

      const derived = derivePositionsFromMovements(movData, accData, assetData)
      setDerivedPositions(derived)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar resumo patrimonial.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const metrics: ConsolidatedOverviewMetrics = React.useMemo(() => {
    return calculateConsolidatedOverview({
      accountBalances,
      positions,
      derivedPositions,
      accounts,
      assets,
      movements,
    })
  }, [accountBalances, positions, derivedPositions, accounts, assets, movements])

  // Saldos de caixa por conta
  const balancesByAccount = React.useMemo(() => {
    return accountBalances.map((bal) => {
      const acc = bal.expand?.account_id || accounts.find((a) => a.id === bal.account_id)
      return {
        id: bal.id,
        accountName: acc?.name || 'Conta Bancária',
        accountType: acc?.account_type || 'outros',
        currency: (bal.currency || 'BRL').toUpperCase(),
        balanceCents: bal.balance_cents || 0,
      }
    })
  }, [accountBalances, accounts])

  // Custo alocado por conta de custódia
  const positionsByAccount = React.useMemo(() => {
    const map = new Map<
      string,
      {
        accountName: string
        currency: string
        totalCostCents: number
        positionsCount: number
      }
    >()

    const effectiveList =
      positions.length > 0
        ? positions.map((p) => {
            const acc = p.expand?.account_id || accounts.find((a) => a.id === p.account_id)
            const ast = p.expand?.asset_id || assets.find((a) => a.id === p.asset_id)
            return {
              accountId: p.account_id,
              accountName: acc?.name || 'Conta',
              currency: (ast?.currency || acc?.currency || 'BRL').toUpperCase(),
              costCents: p.total_cost_cents || 0,
            }
          })
        : derivedPositions.map((p) => ({
            accountId: p.account_id,
            accountName: p.account?.name || 'Conta',
            currency: (p.asset?.currency || p.account?.currency || 'BRL').toUpperCase(),
            costCents: p.total_cost_cents,
          }))

    for (const item of effectiveList) {
      const existing = map.get(item.accountId)
      if (!existing) {
        map.set(item.accountId, {
          accountName: item.accountName,
          currency: item.currency,
          totalCostCents: item.costCents,
          positionsCount: 1,
        })
      } else {
        existing.totalCostCents += item.costCents
        existing.positionsCount += 1
      }
    }

    return Array.from(map.entries()).map(([accountId, data]) => ({
      accountId,
      ...data,
    }))
  }, [positions, derivedPositions, accounts, assets])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Resumo Patrimonial"
          description="Totalizadores consolidados, liquidez imediata e divisão por titularidade."
          icon={Wallet}
          breadcrumbs={[
            { label: 'Visão Geral', href: '/dashboard' },
            { label: 'Resumo Patrimonial' },
          ]}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Consolidando patrimônio e saldos...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasData = metrics.hasAnyData

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumo Patrimonial"
        description="Totalizadores consolidados, liquidez imediata e divisão por titularidade."
        icon={Wallet}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Resumo Patrimonial' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 text-xs">
              <Link to="/wealth/accounts">
                <Building2 className="h-3.5 w-3.5 mr-1" />
                Gerenciar Contas
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 text-xs">
              <Link to="/wealth/movements">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Lançar Movimentação
              </Link>
            </Button>
          </div>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum patrimônio consolidado para exibição"
          description="O resumo patrimonial agrega dados de contas, posições e saldos apurados. Atualmente não há valores computados para seu perfil."
          nextStepGuide="Cadastre suas contas e registre os primeiros aportes na área 'Patrimônio' para calcular seu saldo bruto e líquido automaticamente."
          actionLabel="Cadastrar Primeira Movimentação"
          actionHref="/wealth/movements"
          secondaryActionLabel="Ver Contas & Custódias"
          secondaryActionHref="/wealth/accounts"
        />
      ) : (
        <div className="space-y-6">
          {/* Totalizadores Principais (BRL) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Patrimônio Total Consolidado (BRL)
                </CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading">
                  {formatCurrencyBRL(metrics.totalPatrimonyBrlCents / 100)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Soma de caixa disponível + custo de aquisição em ativos
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Dinheiro em Caixa (Liquidez Imediata)
                </CardTitle>
                <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold font-heading ${
                    metrics.totalCashBrlCents >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-destructive'
                  }`}
                >
                  {formatCurrencyBRL(metrics.totalCashBrlCents / 100)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {metrics.totalPatrimonyBrlCents > 0
                    ? `${(
                        (metrics.totalCashBrlCents / metrics.totalPatrimonyBrlCents) *
                        100
                      ).toFixed(1)}% do patrimônio em moeda local`
                    : 'Disponível em contas correntes/investimento'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Capital em Posições (Custo de Entrada)
                </CardTitle>
                <Coins className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading">
                  {formatCurrencyBRL(metrics.totalInvestedCostBrlCents / 100)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {metrics.activePositionsCount} posição(ões) ativas custodiadas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Seção por Moeda: Tratamento Robusto de Moedas Estrangeiras */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-primary" />
                  Divisão de Patrimônio por Moeda
                </h2>
                <p className="text-xs text-muted-foreground">
                  Moedas segregadas sem conversão artificial (preservação contábil)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.currencySummaries.map((curr) => {
                const totalDecimal = curr.totalCostCents / 100
                const cashDecimal = curr.cashCents / 100
                const investedDecimal = curr.investedCostCents / 100

                const formatCurrValue = (val: number) => {
                  if (curr.currency === 'BRL') return formatCurrencyBRL(val)
                  if (curr.currency === 'USD')
                    return `$ ${val.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  if (curr.currency === 'EUR')
                    return `€ ${val.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  return `${curr.currency} ${val.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                }

                return (
                  <Card key={curr.currency} className="border-border/80 bg-card">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs font-semibold">
                          {curr.currency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {curr.positionsCount} posições &bull; {curr.accountsCount} contas
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-1 text-xs">
                      <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground font-medium">Total na Moeda:</span>
                        <span className="font-mono font-bold text-base text-foreground">
                          {formatCurrValue(totalDecimal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground pt-1">
                        <span>Dinheiro em Caixa:</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrValue(cashDecimal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Custo em Ativos:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {formatCurrValue(investedDecimal)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Divisão por Contas e Custodiantes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Caixa por Conta */}
            <Card className="border-border/80">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Saldos em Caixa por Conta
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Liquidez apurada diretamente de account_balances
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/wealth/accounts">Ver Contas</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {balancesByAccount.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum saldo em conta apurado.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {balancesByAccount.map((b) => (
                      <div
                        key={b.id}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{b.accountName}</p>
                          <p className="text-[11px] text-muted-foreground">Moeda: {b.currency}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-semibold ${
                              b.balanceCents >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-destructive'
                            }`}
                          >
                            {b.currency === 'BRL'
                              ? formatCurrencyBRL(b.balanceCents / 100)
                              : `${b.currency} ${(b.balanceCents / 100).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Custódia de Ativos por Conta */}
            <Card className="border-border/80">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    Custódia em Ativos por Conta
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Alocação de capital investido por instituição custodiante
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/wealth/positions">Ver Posições</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {positionsByAccount.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum ativo alocado em custódia.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {positionsByAccount.map((p) => (
                      <div
                        key={p.accountId}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{p.accountName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.positionsCount} ativo(s) &bull; Moeda: {p.currency}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-semibold text-foreground">
                            {p.currency === 'BRL'
                              ? formatCurrencyBRL(p.totalCostCents / 100)
                              : `${p.currency} ${(p.totalCostCents / 100).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
