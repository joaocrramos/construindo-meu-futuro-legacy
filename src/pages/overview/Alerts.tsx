import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Loader2,
  Check,
  CheckCheck,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  listAlerts,
  markAlertRead,
  markAllAlertsRead,
  triggerAlertsCheck,
  type AlertRecord,
  ALERT_TYPE_LABELS,
} from '@/services/alerts'
import { formatDateBRL } from '@/lib/formatters'
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
  const [alerts, setAlerts] = React.useState<AlertRecord[]>([])
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [markingAll, setMarkingAll] = React.useState(false)
  const [runningCheck, setRunningCheck] = React.useState(false)

  // Filtros locais de visualização
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all') // 'all' | 'unread' | 'read'

  const loadAlerts = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await listAlerts()
      setAlerts(data)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar alertas.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const handleToggleRead = async (alert: AlertRecord) => {
    try {
      setUpdatingId(alert.id)
      const newStatus = !alert.is_read
      const updated = await markAlertRead(alert.id, newStatus)
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)))
      toast.success(newStatus ? 'Alerta marcado como lido.' : 'Alerta marcado como não lido.')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao atualizar alerta.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRunCheck = async () => {
    try {
      setRunningCheck(true)
      const res = await triggerAlertsCheck()
      toast.success(
        res.alerts_created > 0
          ? `${res.alerts_created} novo(s) alerta(s) gerado(s).`
          : 'Varredura concluída. Nenhum novo alerta pendente.',
      )
      await loadAlerts()
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao executar verificação de alertas.')
    } finally {
      setRunningCheck(false)
    }
  }

  const handleMarkAllRead = async () => {
    const unread = alerts.filter((a) => !a.is_read)
    if (unread.length === 0) {
      toast.info('Não há alertas não lidos.')
      return
    }

    try {
      setMarkingAll(true)
      await markAllAlertsRead(alerts)
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })))
      toast.success('Todos os alertas foram marcados como lidos.')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao marcar alertas como lidos.')
    } finally {
      setMarkingAll(false)
    }
  }

  // Contagem de alertas não lidos
  const unreadCount = React.useMemo(() => {
    return alerts.filter((a) => !a.is_read).length
  }, [alerts])

  // Filtragem dos alertas
  const filteredAlerts = React.useMemo(() => {
    return alerts.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (statusFilter === 'unread' && a.is_read) return false
      if (statusFilter === 'read' && !a.is_read) return false
      return true
    })
  }, [alerts, typeFilter, statusFilter])

  const getActionInfo = (alert: AlertRecord): { label?: string; href?: string } => {
    if (alert.type === 'balance_negative') {
      return { label: 'Ver Contas', href: '/wealth/accounts' }
    }
    if (alert.type === 'maturity_upcoming' || alert.type === 'maturity_today') {
      return { label: 'Ver Vencimentos', href: '/overview/due-dates' }
    }
    return {}
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Alertas"
        description="Notificações automáticas de saldos, prazos de resgates e integridade patrimonial."
        icon={Bell}
        breadcrumbs={[{ label: 'Visão Geral', href: '/dashboard' }, { label: 'Alertas' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunCheck}
              disabled={runningCheck || loading}
              className="gap-1.5 text-xs"
              title="Executar verificação manual de alertas"
            >
              {runningCheck ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-primary" />
              )}
              Verificar Alertas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAlerts}
              disabled={loading || runningCheck}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAll || loading}
                className="gap-1.5 text-xs"
              >
                {markingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Marcar todas como lidas
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Examinando condições de saúde do patrimônio...</p>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nenhum alerta pendente no momento"
          description="Seu portfólio não possui advertências de saldos devedores, títulos vencidos ou notificações urgentes pendentes de atenção."
          nextStepGuide="Quando ativos atingirem o prazo de vencimento ou uma conta apresentar saldo negativo, os avisos aparecerão automaticamente aqui."
        />
      ) : (
        <div className="space-y-4">
          {/* Barra de filtros e contador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {unreadCount > 0
                  ? `${unreadCount} alerta(s) não lido(s)`
                  : 'Nenhum alerta pendente'}
              </span>
              <span className="text-xs text-muted-foreground">
                • {alerts.length} alerta(s) no total
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[160px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="unread">Apenas não lidos</SelectItem>
                    <SelectItem value="read">Apenas lidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tipo de alerta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="maturity_upcoming">
                      {ALERT_TYPE_LABELS.maturity_upcoming}
                    </SelectItem>
                    <SelectItem value="maturity_today">
                      {ALERT_TYPE_LABELS.maturity_today}
                    </SelectItem>
                    <SelectItem value="balance_negative">
                      {ALERT_TYPE_LABELS.balance_negative}
                    </SelectItem>
                    <SelectItem value="system">{ALERT_TYPE_LABELS.system}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground text-xs">
              Nenhum alerta corresponde aos filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const isCrit = alert.severity === 'critical'
                const isWarn = alert.severity === 'warn'
                const action = getActionInfo(alert)
                const isUpdating = updatingId === alert.id

                return (
                  <Card
                    key={alert.id}
                    className={`border transition-opacity ${
                      alert.is_read ? 'opacity-70 bg-card/60' : ''
                    } ${
                      isCrit
                        ? 'border-destructive/40 bg-destructive/5'
                        : isWarn
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : 'border-blue-500/40 bg-blue-500/5'
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
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

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`text-xs font-semibold ${
                                alert.is_read
                                  ? 'text-muted-foreground line-through decoration-muted-foreground/50'
                                  : 'text-foreground'
                              }`}
                            >
                              {alert.title}
                            </h3>
                            <Badge
                              variant={isCrit ? 'destructive' : 'outline'}
                              className="text-[10px] py-0"
                            >
                              {isCrit ? 'Crítico' : isWarn ? 'Atenção' : 'Informativo'}
                            </Badge>
                            {alert.type && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] py-0 font-normal text-muted-foreground"
                              >
                                {ALERT_TYPE_LABELS[alert.type] || alert.type}
                              </Badge>
                            )}
                            {alert.is_read && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 text-muted-foreground bg-muted/30"
                              >
                                Lido
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed break-words">
                            {alert.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/80 pt-0.5">
                            {alert.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Vencimento: {formatDateBRL(alert.due_date)}
                              </span>
                            )}
                            {alert.created && <span>Gerado em {formatDateBRL(alert.created)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleRead(alert)}
                          disabled={isUpdating}
                          className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          title={alert.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : alert.is_read ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" />
                              Desmarcar
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Marcar como lida
                            </>
                          )}
                        </Button>

                        {action.label && action.href && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs shrink-0"
                          >
                            <Link to={action.href}>{action.label}</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
