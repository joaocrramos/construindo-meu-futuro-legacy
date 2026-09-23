import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyBRL } from '@/lib/formatters'
import {
  PieChart as PieChartIcon,
  Plus,
  Loader2,
  Building2,
  Coins,
  ArrowUpDown,
  CircleDot,
  Layers,
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
import {
  listAssets,
  type AssetRecord,
  ASSET_CLASS_LABELS,
  type AssetClass,
} from '@/services/assets'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'

// Paleta visual harmonizada para as classes de ativos e caixa
const CLASS_COLORS: Record<string, string> = {
  fixed_income: '#3b82f6', // blue-500
  equities: '#10b981', // emerald-500
  real_estate_funds: '#f59e0b', // amber-500
  mutual_funds: '#8b5cf6', // purple-500
  crypto: '#ec4899', // pink-500
  cash_equivalent: '#06b6d4', // cyan-500
  cash: '#14b8a6', // teal-500
  other: '#64748b', // slate-500
}

export default function DistributionPage() {
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
      toast.error((err as Error)?.message || 'Erro ao carregar dados de distribuição.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Processa a distribuição por classes de ativos (incluindo Caixa)
  const distributionData = React.useMemo(() => {
    const assetMap = new Map<string, AssetRecord>(assets.map((a) => [a.id, a]))
    const classCostMap = new Map<
      string,
      { label: string; costCents: number; positionsCount: number; color: string }
    >()

    // 1. Dinheiro em Caixa (apenas em BRL para consolidação coerente)
    const totalCashBrlCents = accountBalances
      .filter((b) => (b.currency || 'BRL').toUpperCase() === 'BRL')
      .reduce((sum, b) => sum + (b.balance_cents || 0), 0)

    if (totalCashBrlCents > 0) {
      classCostMap.set('cash', {
        label: 'Dinheiro em Caixa',
        costCents: totalCashBrlCents,
        positionsCount: accountBalances.length,
        color: CLASS_COLORS.cash,
      })
    }

    // 2. Posições em Ativos (apenas BRL para evitar mistura sem taxa cambial)
    const useDb = positions.length > 0
    if (useDb) {
      for (const pos of positions) {
        if (pos.quantity_e8 <= 0) continue
        const ast = pos.expand?.asset_id || assetMap.get(pos.asset_id)
        const curr = (ast?.currency || 'BRL').toUpperCase()
        if (curr !== 'BRL') continue // moedas estrangeiras tratadas à parte

        const assetClass = ast?.asset_class || 'other'
        const label = ASSET_CLASS_LABELS[assetClass as AssetClass] || 'Outros'
        const cost = pos.total_cost_cents || 0

        const existing = classCostMap.get(assetClass)
        if (!existing) {
          classCostMap.set(assetClass, {
            label,
            costCents: cost,
            positionsCount: 1,
            color: CLASS_COLORS[assetClass] || CLASS_COLORS.other,
          })
        } else {
          existing.costCents += cost
          existing.positionsCount += 1
        }
      }
    } else {
      for (const pos of derivedPositions) {
        if (pos.quantity_e8 <= 0) continue
        const curr = (pos.asset?.currency || 'BRL').toUpperCase()
        if (curr !== 'BRL') continue

        const assetClass = pos.asset?.asset_class || 'other'
        const label = ASSET_CLASS_LABELS[assetClass as AssetClass] || 'Outros'
        const cost = pos.total_cost_cents

        const existing = classCostMap.get(assetClass)
        if (!existing) {
          classCostMap.set(assetClass, {
            label,
            costCents: cost,
            positionsCount: 1,
            color: CLASS_COLORS[assetClass] || CLASS_COLORS.other,
          })
        } else {
          existing.costCents += cost
          existing.positionsCount += 1
        }
      }
    }

    const items = Array.from(classCostMap.entries()).map(([key, data]) => ({
      key,
      ...data,
      costDecimal: data.costCents / 100,
    }))

    const totalCents = items.reduce((sum, item) => sum + item.costCents, 0)

    const itemsWithPercent = items.map((item) => ({
      ...item,
      percentage: totalCents > 0 ? (item.costCents / totalCents) * 100 : 0,
    }))

    // Ordena decrescente por alocação
    itemsWithPercent.sort((a, b) => b.costCents - a.costCents)

    return {
      items: itemsWithPercent,
      totalCents,
    }
  }, [accountBalances, positions, derivedPositions, assets])

  // Distribuição por Conta / Instituição
  const accountDistributionData = React.useMemo(() => {
    const accMap = new Map<string, AccountRecord>(accounts.map((a) => [a.id, a]))
    const accountAllocationMap = new Map<
      string,
      {
        accountName: string
        totalCents: number
        cashCents: number
        investedCents: number
      }
    >()

    // Caixa por conta
    for (const b of accountBalances) {
      if ((b.currency || 'BRL').toUpperCase() !== 'BRL') continue
      const acc = b.expand?.account_id || accMap.get(b.account_id)
      const accId = b.account_id
      const name = acc?.name || 'Conta Bancária'

      const existing = accountAllocationMap.get(accId)
      if (!existing) {
        accountAllocationMap.set(accId, {
          accountName: name,
          totalCents: b.balance_cents || 0,
          cashCents: b.balance_cents || 0,
          investedCents: 0,
        })
      } else {
        existing.totalCents += b.balance_cents || 0
        existing.cashCents += b.balance_cents || 0
      }
    }

    // Posições por conta
    const useDb = positions.length > 0
    if (useDb) {
      for (const pos of positions) {
        if (pos.quantity_e8 <= 0) continue
        const acc = pos.expand?.account_id || accMap.get(pos.account_id)
        const ast = pos.expand?.asset_id || assets.find((a) => a.id === pos.asset_id)
        if ((ast?.currency || 'BRL').toUpperCase() !== 'BRL') continue

        const accId = pos.account_id
        const name = acc?.name || 'Conta'
        const cost = pos.total_cost_cents || 0

        const existing = accountAllocationMap.get(accId)
        if (!existing) {
          accountAllocationMap.set(accId, {
            accountName: name,
            totalCents: cost,
            cashCents: 0,
            investedCents: cost,
          })
        } else {
          existing.totalCents += cost
          existing.investedCents += cost
        }
      }
    } else {
      for (const pos of derivedPositions) {
        if (pos.quantity_e8 <= 0) continue
        if ((pos.asset?.currency || 'BRL').toUpperCase() !== 'BRL') continue

        const accId = pos.account_id
        const name = pos.account?.name || 'Conta'
        const cost = pos.total_cost_cents

        const existing = accountAllocationMap.get(accId)
        if (!existing) {
          accountAllocationMap.set(accId, {
            accountName: name,
            totalCents: cost,
            cashCents: 0,
            investedCents: cost,
          })
        } else {
          existing.totalCents += cost
          existing.investedCents += cost
        }
      }
    }

    const items = Array.from(accountAllocationMap.entries()).map(([accountId, data]) => ({
      accountId,
      ...data,
    }))

    const grandTotal = items.reduce((sum, i) => sum + i.totalCents, 0)
    const withPerc = items.map((i) => ({
      ...i,
      percentage: grandTotal > 0 ? (i.totalCents / grandTotal) * 100 : 0,
    }))

    withPerc.sort((a, b) => b.totalCents - a.totalCents)
    return { items: withPerc, grandTotal }
  }, [accountBalances, positions, derivedPositions, accounts, assets])

  // Configuração para o ChartContainer (shadcn)
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    distributionData.items.forEach((item) => {
      config[item.key] = {
        label: item.label,
        color: item.color,
      }
    })
    return config
  }, [distributionData.items])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Distribuição por Categoria"
          description="Alocação percentual por classes de ativos (Renda Fixa, Ações, FIIs, Criptoativos, Imóveis e Caixa)."
          icon={PieChartIcon}
          breadcrumbs={[{ label: 'Visão Geral', href: '/dashboard' }, { label: 'Distribuição' }]}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Calculando alocação por classe e conta...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasData = distributionData.items.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distribuição por Categoria"
        description="Alocação percentual por classes de ativos (Renda Fixa, Ações, FIIs, Criptoativos e Caixa) em base de custo."
        icon={PieChartIcon}
        breadcrumbs={[{ label: 'Visão Geral', href: '/dashboard' }, { label: 'Distribuição' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 text-xs">
              <Link to="/wealth/accounts">
                <Building2 className="h-3.5 w-3.5 mr-1" />
                Contas
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 text-xs">
              <Link to="/wealth/assets">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Cadastrar Ativo
              </Link>
            </Button>
          </div>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={PieChartIcon}
          title="Nenhuma classe de ativos alocada"
          description="O gráfico de distribuição e tabela de alocação exibem a proporção de cada categoria no total do seu patrimônio."
          nextStepGuide="Cadastre os ativos mantidos em custódia ou realize depósitos em conta para visualizar o percentual atual de cada classe."
          actionLabel="Explorar Catálogo de Ativos"
          actionHref="/wealth/assets"
          secondaryActionLabel="Lançar Movimentação"
          secondaryActionHref="/wealth/movements"
        />
      ) : (
        <div className="space-y-6">
          {/* Gráfico Donut + Resumo de Exposição */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico de Pizza / Rosca */}
            <Card className="border-border/80 lg:col-span-6 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Alocação Percentual Consolidada
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Participação relativa calculada sobre o custo de entrada
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="h-[260px] w-full max-w-[320px]">
                  <ChartContainer config={chartConfig} className="h-full w-full aspect-square">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => {
                              const found = distributionData.items.find((i) => i.key === name)
                              return (
                                <div className="flex items-center justify-between gap-3 w-full">
                                  <span className="text-muted-foreground">
                                    {found?.label || name}:
                                  </span>
                                  <span className="font-mono font-medium">
                                    {formatCurrencyBRL(Number(value))} (
                                    {found ? found.percentage.toFixed(1) : 0}%)
                                  </span>
                                </div>
                              )
                            }}
                          />
                        }
                      />
                      <Pie
                        data={distributionData.items}
                        dataKey="costDecimal"
                        nameKey="key"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {distributionData.items.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground font-medium">
                    Patrimônio Consolidado
                  </p>
                  <p className="text-xl font-bold font-heading text-foreground">
                    {formatCurrencyBRL(distributionData.totalCents / 100)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lista Detalhada das Classes com Barras de Progresso */}
            <Card className="border-border/80 lg:col-span-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Composição por Classe de Ativo
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {distributionData.items.length} categoria(s) com recursos alocados
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="divide-y divide-border/60">
                  {distributionData.items.map((item) => (
                    <div key={item.key} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-foreground">{item.label}</span>
                          <span className="text-[11px] text-muted-foreground">
                            ({item.positionsCount}{' '}
                            {item.key === 'cash' ? 'conta(s)' : 'posição(ões)'})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-foreground">
                            {formatCurrencyBRL(item.costDecimal)}
                          </span>
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground font-medium">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Barra de preenchimento proporcional */}
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribuição por Conta / Custodiante */}
          <Card className="border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Alocação por Instituição / Conta
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Distribuição de capital entre contas correntes e corretoras
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Conta / Instituição</th>
                      <th className="px-4 py-3 text-right">Dinheiro em Caixa</th>
                      <th className="px-4 py-3 text-right">Ativos em Custódia</th>
                      <th className="px-4 py-3 text-right">Total Alocado</th>
                      <th className="px-4 py-3 text-right">Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {accountDistributionData.items.map((acc) => (
                      <tr key={acc.accountId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {acc.accountName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrencyBRL(acc.cashCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">
                          {formatCurrencyBRL(acc.investedCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatCurrencyBRL(acc.totalCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground font-medium">
                          {acc.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
