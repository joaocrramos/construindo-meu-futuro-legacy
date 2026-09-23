import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyBRL } from '@/lib/formatters'
import {
  Target,
  Plus,
  Loader2,
  FolderTree,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { listPortfolios, type PortfolioRecord } from '@/services/portfolios'
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
import { calculateConsolidatedOverview } from '@/services/overviewAggregations'
import { toast } from 'sonner'

export default function GoalsOverviewPage() {
  const [loading, setLoading] = React.useState(true)
  const [portfolios, setPortfolios] = React.useState<PortfolioRecord[]>([])
  const [accountBalances, setAccountBalances] = React.useState<AccountBalanceRecord[]>([])
  const [positions, setPositions] = React.useState<PositionRecord[]>([])
  const [derivedPositions, setDerivedPositions] = React.useState<DerivedPosition[]>([])
  const [movements, setMovements] = React.useState<MovementRecord[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [portData, balData, posData, movData, accData, assetData] = await Promise.all([
        listPortfolios(),
        listAccountBalances(),
        listPositions(),
        listMovements(),
        listAccounts(),
        listAssets(),
      ])

      setPortfolios(portData)
      setAccountBalances(balData)
      setPositions(posData)
      setMovements(movData)
      setAccounts(accData)
      setAssets(assetData)

      const derived = derivePositionsFromMovements(movData, accData, assetData)
      setDerivedPositions(derived)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar dados de metas.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const metrics = React.useMemo(() => {
    return calculateConsolidatedOverview({
      accountBalances,
      positions,
      derivedPositions,
      accounts,
      assets,
      movements,
    })
  }, [accountBalances, positions, derivedPositions, accounts, assets, movements])

  const totalPatrimonyCents = metrics.totalPatrimonyBrlCents

  // Carteiras que possuem target_amount_cents configurado
  const goalsWithTargets = React.useMemo(() => {
    return portfolios
      .filter((p) => !p.is_archived && p.target_amount_cents && p.target_amount_cents > 0)
      .map((p) => {
        const target = p.target_amount_cents || 0
        // Como o rateio de posições por carteira é opcional nesta fase, compara com o patrimônio consolidado
        const progress = target > 0 ? Math.min(100, (totalPatrimonyCents / target) * 100) : 0
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          targetCents: target,
          progress,
        }
      })
  }, [portfolios, totalPatrimonyCents])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Progresso das Metas"
          description="Acompanhamento do valor acumulado em relação às metas financeiras de curto, médio e longo prazo."
          icon={Target}
          breadcrumbs={[
            { label: 'Visão Geral', href: '/dashboard' },
            { label: 'Progresso das Metas' },
          ]}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Calculando atingimento de metas...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasPortfolios = portfolios.length > 0
  const hasGoals = goalsWithTargets.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progresso das Metas"
        description="Acompanhamento do patrimônio acumulado em relação aos objetivos financeiros planejados."
        icon={Target}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Progresso das Metas' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/portfolios">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Gerenciar Carteiras
            </Link>
          </Button>
        }
      />

      {!hasPortfolios ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta financeira cadastrada"
          description="Definir metas com valores e carteiras estratégicas permite mensurar a velocidade de acúmulo de capital e independência financeira."
          nextStepGuide="Crie sua primeira carteira estratégica com valor alvo na aba 'Patrimônio > Carteiras' para acompanhar o progresso aqui."
          actionLabel="Cadastrar Primeira Carteira"
          actionHref="/wealth/portfolios"
          secondaryActionLabel="Ver Resumo Patrimonial"
          secondaryActionHref="/overview/summary"
        />
      ) : !hasGoals ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta de valor alvo definida para suas carteiras"
          description={`Você possui ${portfolios.length} carteira(s) cadastrada(s), mas nenhuma possui um valor alvo (target) estabelecido.`}
          nextStepGuide="Edite suas carteiras em 'Patrimônio > Carteiras' e preencha o campo de 'Valor Alvo' para habilitar as réguas de progresso."
          actionLabel="Configurar Valor Alvo das Carteiras"
          actionHref="/wealth/portfolios"
        />
      ) : (
        <div className="space-y-6">
          {/* Card Resumo do Patrimônio Vigente */}
          <Card className="border-border/80 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Base Patrimonial Consolidada para Metas (BRL)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-primary">
                {formatCurrencyBRL(totalPatrimonyCents / 100)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Patrimônio atual comparado contra os alvos estratégicos definidos
              </p>
            </CardContent>
          </Card>

          {/* Lista de Metas */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Metas por Carteira
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goalsWithTargets.map((goal) => (
                <Card key={goal.id} className="border-border/80 bg-card">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{goal.name}</CardTitle>
                      {goal.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={goal.progress >= 100 ? 'default' : 'outline'}>
                      {goal.progress.toFixed(1)}%
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          goal.progress >= 100 ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Atual: {formatCurrencyBRL(totalPatrimonyCents / 100)}</span>
                      <span className="font-semibold text-foreground">
                        Meta: {formatCurrencyBRL(goal.targetCents / 100)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
