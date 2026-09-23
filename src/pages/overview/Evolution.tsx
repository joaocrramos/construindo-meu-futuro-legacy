import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyBRL } from '@/lib/formatters'
import {
  TrendingUp,
  ArrowUpDown,
  Loader2,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { listMovements, type MovementRecord } from '@/services/movements'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { toast } from 'sonner'

interface MonthlyAggregate {
  monthKey: string // YYYY-MM
  displayMonth: string // Mês/Ano
  depositsCents: number
  withdrawalsCents: number
  netInflowCents: number
  cumulativeInflowCents: number
  movementsCount: number
}

const chartConfig = {
  deposits: {
    label: 'Aportes (Depósitos)',
    color: '#10b981', // emerald-500
  },
  withdrawals: {
    label: 'Resgates (Saques)',
    color: '#f43f5e', // rose-500
  },
  cumulative: {
    label: 'Aportes Acumulados',
    color: '#3b82f6', // blue-500
  },
} satisfies ChartConfig

export default function EvolutionPage() {
  const [loading, setLoading] = React.useState(true)
  const [movements, setMovements] = React.useState<MovementRecord[]>([])

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const movData = await listMovements()

      setMovements(movData)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar histórico de evolução.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Agrega dados mensais a partir de movimentações válidas (não estornadas)
  const monthlyData: MonthlyAggregate[] = React.useMemo(() => {
    if (movements.length === 0) return []

    // Filtra movimentações válidas ordenadas por data crescente
    const validMovements = movements
      .filter((m) => !m.is_reversed)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (validMovements.length === 0) return []

    const map = new Map<
      string,
      {
        depositsCents: number
        withdrawalsCents: number
        movementsCount: number
      }
    >()

    for (const m of validMovements) {
      const monthKey = m.date.slice(0, 7) // "YYYY-MM"
      let current = map.get(monthKey)
      if (!current) {
        current = { depositsCents: 0, withdrawalsCents: 0, movementsCount: 0 }
        map.set(monthKey, current)
      }

      current.movementsCount += 1

      if (m.movement_type === 'deposit') {
        current.depositsCents += m.net_amount_cents || m.gross_amount_cents || 0
      } else if (m.movement_type === 'withdrawal') {
        current.withdrawalsCents += m.net_amount_cents || m.gross_amount_cents || 0
      }
    }

    // Ordena meses cronologicamente
    const sortedKeys = Array.from(map.keys()).sort()
    let runningCumulativeCents = 0

    return sortedKeys.map((key) => {
      const item = map.get(key)!
      const net = item.depositsCents - item.withdrawalsCents
      runningCumulativeCents += net

      // Formatação amigável do mês: 2026-03 -> mar/26
      const [year, month] = key.split('-')
      const dateObj = new Date(Number(year), Number(month) - 1, 1)
      const displayMonth = dateObj.toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      })

      return {
        monthKey: key,
        displayMonth,
        depositsCents: item.depositsCents,
        withdrawalsCents: item.withdrawalsCents,
        netInflowCents: net,
        cumulativeInflowCents: runningCumulativeCents,
        movementsCount: item.movementsCount,
      }
    })
  }, [movements])

  // Totalizadores gerais de aportes
  const totals = React.useMemo(() => {
    const totalDeposits = monthlyData.reduce((acc, m) => acc + m.depositsCents, 0)
    const totalWithdrawals = monthlyData.reduce((acc, m) => acc + m.withdrawalsCents, 0)
    const netInflow = totalDeposits - totalWithdrawals

    return {
      totalDeposits,
      totalWithdrawals,
      netInflow,
      monthsCount: monthlyData.length,
    }
  }, [monthlyData])

  // Dados para o Recharts
  const chartData = React.useMemo(() => {
    return monthlyData.map((m) => ({
      month: m.displayMonth,
      fullMonth: m.monthKey,
      deposits: m.depositsCents / 100,
      withdrawals: m.withdrawalsCents / 100,
      net: m.netInflowCents / 100,
      cumulative: m.cumulativeInflowCents / 100,
    }))
  }, [monthlyData])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evolução do Patrimônio"
          description="Acompanhamento temporal da valorização, aportes mensais e histórico de rentabilidade."
          icon={TrendingUp}
          breadcrumbs={[
            { label: 'Visão Geral', href: '/dashboard' },
            { label: 'Evolução do Patrimônio' },
          ]}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Processando série histórica de lançamentos...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasData = movements.length > 0 && monthlyData.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evolução do Patrimônio"
        description="Acompanhamento temporal dos aportes mensais, resgates e fluxo líquido acumulado."
        icon={TrendingUp}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Evolução do Patrimônio' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/movements">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              Lançar Movimentação
            </Link>
          </Button>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="Histórico de evolução temporal não disponível"
          description="A curva de evolução patrimonial é gerada a partir dos lançamentos de aportes e retiradas registrados no livro-razão ao longo do tempo."
          nextStepGuide="Registre seus primeiros aportes em 'Movimentações' para iniciar a série histórica de crescimento do seu capital."
          actionLabel="Cadastrar Primeira Movimentação"
          actionHref="/wealth/movements"
        />
      ) : (
        <div className="space-y-6">
          {/* Cards de Métricas Gerais de Fluxo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total de Aportes Realizados
                </CardTitle>
                <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyBRL(totals.totalDeposits / 100)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Soma de todos os depósitos registrados
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total de Resgates
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading text-rose-500">
                  {formatCurrencyBRL(totals.totalWithdrawals / 100)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Saques e retiradas de capital
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Aporte Líquido Acumulado
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading text-primary">
                  {formatCurrencyBRL(totals.netInflow / 100)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Distribuído em {totals.monthsCount} mês(es) com lançamentos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Barras: Aportes vs Resgates por Mês */}
          <Card className="border-border/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  Fluxo Mensal de Capital (Aportes vs Resgates)
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Valores apurados em reais (BRL) mês a mês
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full pt-4">
                <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            const label = name === 'deposits' ? 'Aportes' : 'Resgates'
                            return (
                              <div className="flex items-center justify-between gap-4 w-full">
                                <span className="text-muted-foreground">{label}:</span>
                                <span className="font-mono font-medium">
                                  {formatCurrencyBRL(Number(value))}
                                </span>
                              </div>
                            )
                          }}
                        />
                      }
                    />
                    <Bar dataKey="deposits" name="deposits" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="withdrawals"
                      name="withdrawals"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Fechamentos Mensais */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Histórico Mensal Consolidado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Competência</th>
                      <th className="px-4 py-3 text-right">Aportes (Depósitos)</th>
                      <th className="px-4 py-3 text-right">Resgates (Saques)</th>
                      <th className="px-4 py-3 text-right">Fluxo Líquido</th>
                      <th className="px-4 py-3 text-right">Acumulado Histórico</th>
                      <th className="px-4 py-3 text-center">Lançamentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {monthlyData.map((m) => (
                      <tr key={m.monthKey} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {m.displayMonth}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {m.depositsCents > 0
                            ? `+ ${formatCurrencyBRL(m.depositsCents / 100)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-500">
                          {m.withdrawalsCents > 0
                            ? `- ${formatCurrencyBRL(m.withdrawalsCents / 100)}`
                            : '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-medium ${
                            m.netInflowCents >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500'
                          }`}
                        >
                          {formatCurrencyBRL(m.netInflowCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatCurrencyBRL(m.cumulativeInflowCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {m.movementsCount} mov(s)
                          </Badge>
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
