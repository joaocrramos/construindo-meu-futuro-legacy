import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyBRL, formatDateBRL } from '@/lib/formatters'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { listPositions, type PositionRecord } from '@/services/positions'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAssets, type AssetRecord } from '@/services/assets'
import { listAccountBalances, type AccountBalanceRecord } from '@/services/accountBalances'
import { toast } from 'sonner'

export interface AlertItem {
  id: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  actionLabel?: string
  actionHref?: string
}

export default function AlertsPage() {
  const [loading, setLoading] = React.useState(true)
  const [positions, setPositions] = React.useState<PositionRecord[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [accountBalances, setAccountBalances] = React.useState<AccountBalanceRecord[]>([])

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [posData, accData, assetData, balData] = await Promise.all([
        listPositions(),
        listAccounts(),
        listAssets(),
        listAccountBalances(),
      ])

      setPositions(posData)
      setAccounts(accData)
      setAssets(assetData)
      setAccountBalances(balData)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar alertas.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const accountMap = React.useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const assetMap = React.useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])

  // Avalia condições reais da conta para gerar alertas dinâmicos
  const activeAlerts: AlertItem[] = React.useMemo(() => {
    const alerts: AlertItem[] = []
    const nowStr = new Date().toISOString().slice(0, 10)

    // 1. Alerta de saldo negativo em contas de caixa
    for (const bal of accountBalances) {
      if (bal.balance_cents < 0) {
        const acc = bal.expand?.account_id || accountMap.get(bal.account_id)
        alerts.push({
          id: `neg_balance_${bal.id}`,
          title: `Saldo Negativo em Caixa: ${acc?.name || 'Conta'}`,
          description: `A conta apresenta saldo negativo de ${formatCurrencyBRL(
            bal.balance_cents / 100,
          )} (${bal.currency}). Verifique lançamentos pendentes ou realize um aporte para cobrir o saldo devedor.`,
          severity: 'critical',
          actionLabel: 'Ver Conta',
          actionHref: '/wealth/accounts',
        })
      }
    }

    // 2. Alerta de vencimentos próximos (próximos 30 dias) ou vencidos
    for (const pos of positions) {
      if (pos.maturity_date && pos.quantity_e8 > 0) {
        const ast = pos.expand?.asset_id || assetMap.get(pos.asset_id)
        const ticker = ast?.ticker || 'Ativo'
        const matDate = pos.maturity_date

        if (matDate < nowStr) {
          alerts.push({
            id: `expired_${pos.id}`,
            title: `Título Vencido em Custódia: ${ticker}`,
            description: `O ativo atingiu a data de vencimento em ${formatDateBRL(
              matDate,
            )}. Lance a liquidação ou resgate em Movimentações.`,
            severity: 'warning',
            actionLabel: 'Lançar Resgate',
            actionHref: '/wealth/movements',
          })
        } else {
          const days = Math.ceil(
            (new Date(matDate).getTime() - new Date(nowStr).getTime()) / (1000 * 60 * 60 * 24),
          )
          if (days <= 30) {
            alerts.push({
              id: `due_soon_${pos.id}`,
              title: `Vencimento Próximo: ${ticker}`,
              description: `Este título de renda fixa vencerá em ${formatDateBRL(
                matDate,
              )} (em ${days} dias). Planeje o reinvestimento do capital.`,
              severity: 'info',
              actionLabel: 'Ver Vencimentos',
              actionHref: '/overview/due-dates',
            })
          }
        }
      }
    }

    return alerts
  }, [accountBalances, positions, accountMap, assetMap])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Central de Alertas"
          description="Notificações sobre rebalanceamento de carteira, saldos devedores e vencimento de títulos."
          icon={Bell}
          breadcrumbs={[{ label: 'Visão Geral', href: '/dashboard' }, { label: 'Alertas' }]}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Examinando condições de saúde do patrimônio...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasAlerts = activeAlerts.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Alertas"
        description="Notificações automáticas de saldos, prazos de resgates e integridade patrimonial."
        icon={Bell}
        breadcrumbs={[{ label: 'Visão Geral', href: '/dashboard' }, { label: 'Alertas' }]}
      />

      {!hasAlerts ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nenhum alerta pendente no momento"
          description="Seu portfólio não possui advertências de saldos devedores, títulos vencidos ou notificações urgentes pendentes de atenção."
          nextStepGuide="Quando ativos atingirem o prazo de vencimento ou uma conta apresentar saldo negativo, os avisos aparecerão automaticamente aqui."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>{activeAlerts.length} alerta(s) requerem atenção</span>
          </div>

          <div className="space-y-3">
            {activeAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical'
              const isWarn = alert.severity === 'warning'

              return (
                <Card
                  key={alert.id}
                  className={`border ${
                    isCrit
                      ? 'border-destructive/40 bg-destructive/5'
                      : isWarn
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-blue-500/40 bg-blue-500/5'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full shrink-0 mt-0.5 ${
                          isCrit
                            ? 'bg-destructive/10 text-destructive'
                            : isWarn
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isCrit ? (
                          <ShieldAlert className="h-5 w-5" />
                        ) : isWarn ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-foreground">{alert.title}</h3>
                          <Badge
                            variant={isCrit ? 'destructive' : 'outline'}
                            className="text-[10px] py-0"
                          >
                            {isCrit ? 'Crítico' : isWarn ? 'Atenção' : 'Informativo'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    {alert.actionLabel && alert.actionHref && (
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs shrink-0">
                        <Link to={alert.actionHref}>{alert.actionLabel}</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
