import * as React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyBRL, formatDateBRL } from '@/lib/formatters'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PieChart,
  Calendar,
  AlertCircle,
  FolderTree,
  ArrowUpDown,
  Building2,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { listAccountBalances, type AccountBalanceRecord } from '@/services/accountBalances'
import {
  listPositions,
  derivePositionsFromMovements,
  type PositionRecord,
  type DerivedPosition,
} from '@/services/positions'
import {
  listMovements,
  formatQuantityE8,
  MOVEMENT_TYPE_LABELS,
  type MovementRecord,
} from '@/services/movements'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAssets, type AssetRecord, ASSET_CLASS_LABELS } from '@/services/assets'
import {
  calculateConsolidatedOverview,
  type ConsolidatedOverviewMetrics,
} from '@/services/overviewAggregations'
import { toast } from 'sonner'

export default function Dashboard() {
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
      toast.error((err as Error)?.message || 'Erro ao carregar dados do dashboard.')
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

  // Identificação das 5 movimentações mais recentes
  const recentMovements = React.useMemo(() => {
    return [...movements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [movements])

  // Posições mais relevantes por custo
  const topPositions = React.useMemo(() => {
    const list =
      positions.length > 0
        ? positions.map((p) => {
            const acc = p.expand?.account_id || accounts.find((a) => a.id === p.account_id)
            const ast = p.expand?.asset_id || assets.find((a) => a.id === p.asset_id)
            return {
              key: p.id,
              ticker: ast?.ticker || 'Ativo',
              name: ast?.name || '',
              accountName: acc?.name || 'Conta',
              assetClass: ast?.asset_class ? ASSET_CLASS_LABELS[ast.asset_class] : '—',
              quantityE8: p.quantity_e8,
              costCents: p.total_cost_cents || 0,
            }
          })
        : derivedPositions.map((p) => ({
            key: p.key,
            ticker: p.asset?.ticker || 'Ativo',
            name: p.asset?.name || '',
            accountName: p.account?.name || 'Conta',
            assetClass: p.asset?.asset_class ? ASSET_CLASS_LABELS[p.asset.asset_class] : '—',
            quantityE8: p.quantity_e8,
            costCents: p.total_cost_cents,
          }))

    return list.sort((a, b) => b.costCents - a.costCents).slice(0, 5)
  }, [positions, derivedPositions, accounts, assets])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Consolidado"
          description="Visão geral do seu patrimônio, métricas de alocação e alertas recentes."
          icon={LayoutDashboard}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Carregando indicadores consolidados...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasData = metrics.hasAnyData

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Consolidado"
        description="Visão geral do seu patrimônio, métricas de alocação e alertas recentes."
        icon={LayoutDashboard}
        badge="Tempo Real"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 text-xs">
              <Link to="/wealth/accounts">
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                Contas
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 text-xs font-semibold">
              <Link to="/wealth/movements">
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                Lançar Movimentação
              </Link>
            </Button>
          </div>
        }
      />

      {/* Metric KPI Cards com dados reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Patrimônio Total em BRL (Caixa + Custo em Ativos) */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Patrimônio Total (Custo de Entrada)
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {formatCurrencyBRL(metrics.totalPatrimonyBrlCents / 100)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.totalPatrimonyBrlCents > 0
                ? `${formatCurrencyBRL(metrics.totalCashBrlCents / 100)} em caixa + ${formatCurrencyBRL(
                    metrics.totalInvestedCostBrlCents / 100,
                  )} em ativos`
                : 'Nenhum saldo ou ativo registrado'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Dinheiro em Caixa Total (Disponível) */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Dinheiro em Caixa Disponível
            </CardTitle>
            <TrendingUp
              className={`h-4 w-4 ${
                metrics.totalCashBrlCents >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive'
              }`}
            />
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
              {accountBalances.length > 0
                ? `${accountBalances.length} conta(s) com saldo apurado`
                : 'Aguardando depósitos ou saldos'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Classes de Ativos */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Classes de Ativos
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {metrics.distinctAssetClassesCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.activePositionsCount > 0
                ? `${metrics.activePositionsCount} posição(ões) em custódia ativa`
                : 'Nenhuma posição ativa em carteira'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Próximo Vencimento */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Próximo Vencimento
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {metrics.nextMaturityDate ? formatDateBRL(metrics.nextMaturityDate) : '—'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.nextMaturityDate
                ? metrics.nextMaturityAssetTicker
                  ? `Ativo: ${metrics.nextMaturityAssetTicker}`
                  : 'Compromisso agendado'
                : 'Sem compromissos futuros agendados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Moedas Estrangeiras (não somadas sem conversão) */}
      {metrics.hasNonBrlCurrencies && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-xs">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Saldos em Moeda Estrangeira Detectados</p>
            <p className="text-muted-foreground">
              Você possui contas ou ativos cotados em moedas diferentes de BRL (ex.: USD/EUR). Por
              segurança e precisão contábil, valores de moedas diferentes não são somados
              automaticamente sem taxa de câmbio oficial. Consulte os valores segregados na aba{' '}
              <Link to="/overview/summary" className="underline font-medium text-foreground">
                Resumo Patrimonial
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {!hasData ? (
        /* Estado vazio amigável quando não há dados cadastrados */
        <EmptyState
          icon={FolderTree}
          title="Seu patrimônio ainda não possui registros cadastrados"
          description="Registre suas primeiras contas, ativos ou movimentações financeiras para começar a acompanhar seu patrimônio consolidado em tempo real."
          nextStepGuide="Acesse a seção 'Patrimônio > Contas' para cadastrar sua instituição financeira ou registre diretamente uma movimentação de aporte."
          actionLabel="Registrar Primeira Movimentação"
          actionHref="/wealth/movements"
          secondaryActionLabel="Cadastrar Conta Bancária"
          secondaryActionHref="/wealth/accounts"
        />
      ) : (
        /* Visão com dados reais: Tabelas e Resumos rápidos */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Principais Posições por Custo */}
          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  Maiores Posições (Custo de Entrada)
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Top 5 ativos com maior capital alocado
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/wealth/positions">
                  Ver todas
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {topPositions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum ativo custodiado no momento.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {topPositions.map((pos) => (
                    <div
                      key={pos.key}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">{pos.ticker}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                            {pos.assetClass}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {pos.name || pos.accountName} &bull; Qtd:{' '}
                          {formatQuantityE8(pos.quantityE8)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold text-foreground">
                          {formatCurrencyBRL(pos.costCents / 100)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Custo total</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Movimentações Recentes */}
          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-primary" />
                  Movimentações Recentes
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Últimos lançamentos efetuados no livro-razão
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/wealth/movements">
                  Ver todas
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentMovements.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma movimentação registrada até o momento.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentMovements.map((mov) => {
                    const acc =
                      mov.expand?.account_id || accounts.find((a) => a.id === mov.account_id)
                    const ast = mov.expand?.asset_id || assets.find((a) => a.id === mov.asset_id)
                    const isCredit = [
                      'deposit',
                      'dividend',
                      'interest_on_capital',
                      'sell',
                    ].includes(mov.movement_type)

                    return (
                      <div
                        key={mov.id}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-full shrink-0 ${
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {MOVEMENT_TYPE_LABELS[mov.movement_type] || mov.movement_type}
                              {ast?.ticker ? ` - ${ast.ticker}` : ''}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {formatDateBRL(mov.date)} &bull; {acc?.name || 'Conta'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-semibold ${
                              isCredit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-foreground'
                            }`}
                          >
                            {isCredit ? '+ ' : ''}
                            {formatCurrencyBRL(mov.net_amount_cents / 100)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grid com seções informativas de integridade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Status de Isolamento & Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              &bull; <strong>Isolamento de Titularidade:</strong> Cada conta possui RLS (Row-Level
              Security) restringindo a leitura e gravação estritamente aos próprios registros.
            </p>
            <p>
              &bull; <strong>Livro-Razão Contábil:</strong> Saldos de caixa e posições são derivados
              das movimentações auditáveis.
            </p>
            <p>
              &bull; <strong>Valores em Custo:</strong> Totalizadores baseados em custos de
              aquisição sem estimativas de mercado artificiais.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              Atalhos de Gestão Patrimonial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              1. <strong>Contas & Caixa:</strong> Monitore saldos disponíveis por instituição na aba{' '}
              <Link to="/wealth/accounts" className="underline font-medium text-foreground">
                Contas
              </Link>
              .
            </p>
            <p>
              2. <strong>Catálogo de Ativos:</strong> Cadastre ações, FIIs e títulos em{' '}
              <Link to="/wealth/assets" className="underline font-medium text-foreground">
                Ativos
              </Link>
              .
            </p>
            <p>
              3. <strong>Custódia em Detalhes:</strong> Acompanhe preço médio e quantidades em{' '}
              <Link to="/wealth/positions" className="underline font-medium text-foreground">
                Posições
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
