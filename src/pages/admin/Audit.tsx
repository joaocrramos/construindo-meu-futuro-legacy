import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import {
  FileText,
  Download,
  ShieldCheck,
  Filter,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Info,
  Eye,
} from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { listAuditLogs, type AuditLogRecord } from '@/services/auditLogs'
import { formatDateBRL } from '@/lib/formatters'
import pb from '@/lib/pocketbase/client'

export default function AdminAuditPage() {
  // Estado de Auditoria
  const [auditLogs, setAuditLogs] = React.useState<AuditLogRecord[]>([])
  const [loadingLogs, setLoadingLogs] = React.useState(true)
  const [totalLogs, setTotalLogs] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)

  // Filtros de Auditoria
  const [eventTypeFilter, setEventTypeFilter] = React.useState<string>('ALL')
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL')
  const [userIdFilter, setUserIdFilter] = React.useState<string>('ALL')
  const [usersList, setUsersList] = React.useState<
    Array<{ id: string; name: string; email: string }>
  >([])

  // Modal de Detalhes do Log
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRecord | null>(null)

  // Carregar usuários para o filtro
  React.useEffect(() => {
    let isMounted = true
    pb.collection('users')
      .getFullList<{ id: string; name?: string; email?: string }>({
        sort: 'name,email',
        requestKey: null,
      })
      .then((users) => {
        if (isMounted) {
          setUsersList(
            users.map((u) => ({
              id: u.id,
              name: u.name || u.email || u.id,
              email: u.email || '',
            })),
          )
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar lista de usuários para filtro de auditoria:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Carregar Logs de Auditoria
  const loadLogs = React.useCallback(
    async (targetPage = 1) => {
      setLoadingLogs(true)
      try {
        const res = await listAuditLogs({
          page: targetPage,
          perPage: 15,
          eventType: eventTypeFilter,
          severity: severityFilter,
          userId: userIdFilter,
        })
        setAuditLogs(res.items)
        setTotalLogs(res.totalItems)
        setTotalPages(res.totalPages)
        setPage(res.page)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao buscar logs de auditoria'
        toast.error('Erro na auditoria', { description: message })
      } finally {
        setLoadingLogs(false)
      }
    },
    [eventTypeFilter, severityFilter, userIdFilter],
  )

  React.useEffect(() => {
    loadLogs(1)
  }, [loadLogs])

  // Exportar Logs como CSV
  const handleExportCSV = () => {
    if (auditLogs.length === 0) {
      toast.info('Nenhum dado para exportar na visualização atual.')
      return
    }

    const headers = [
      'ID',
      'Data/Hora (UTC)',
      'Severidade',
      'Tipo de Evento',
      'Entidade',
      'Entidade ID',
      'Resumo',
    ]
    const rows = auditLogs.map((log) => [
      `"${log.id}"`,
      `"${log.created}"`,
      `"${log.severity}"`,
      `"${log.event_type}"`,
      `"${log.entity || ''}"`,
      `"${log.entity_id || ''}"`,
      `"${(log.summary || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `auditoria_patrimonial_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Arquivo CSV de auditoria exportado com sucesso!')
  }

  // Renderizar Badge de Severidade
  const renderSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            Crítico
          </Badge>
        )
      case 'warn':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px]">
            Atenção
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-muted-foreground text-[11px]">
            Info
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilha de Auditoria & Governança"
        description="Monitoramento cronológico imutável de operações financeiras, acessos, convites e eventos críticos de segurança."
        icon={FileText}
        badge="Auditoria"
        breadcrumbs={[{ label: 'Administração', href: '/admin/users' }, { label: 'Auditoria' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs"
              onClick={() => loadLogs(page)}
              disabled={loadingLogs}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingLogs ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs"
              onClick={handleExportCSV}
              disabled={auditLogs.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      {/* Barra de Filtros */}
      <div className="p-4 rounded-lg border border-border bg-card/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Filtros de Trilha</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Tipo de Evento</Label>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="h-9 text-xs bg-background text-foreground border-input">
                <SelectValue placeholder="Todos os eventos" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                <SelectItem value="ALL" className="text-xs">
                  Todos os eventos
                </SelectItem>
                <SelectItem value="BACKUP_CREATED" className="text-xs">
                  Criação de Backup
                </SelectItem>
                <SelectItem value="BACKUP_DOWNLOADED" className="text-xs">
                  Download de Backup
                </SelectItem>
                <SelectItem value="BACKUP_RESTORE_REQUESTED" className="text-xs">
                  Restauração de Backup
                </SelectItem>
                <SelectItem value="INVITE_CREATED" className="text-xs">
                  Convite Emitido
                </SelectItem>
                <SelectItem value="INVITE_ACCEPTED" className="text-xs">
                  Convite Aceito
                </SelectItem>
                <SelectItem value="INVITE_REVOKED" className="text-xs">
                  Convite Revogado
                </SelectItem>
                <SelectItem value="MOVEMENT_CREATED" className="text-xs">
                  Movimentação Criada
                </SelectItem>
                <SelectItem value="MOVEMENT_UPDATED" className="text-xs">
                  Movimentação Editada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Severidade</Label>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-9 text-xs bg-background text-foreground border-input">
                <SelectValue placeholder="Todas as severidades" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                <SelectItem value="ALL" className="text-xs">
                  Todas as severidades
                </SelectItem>
                <SelectItem value="info" className="text-xs">
                  Informativo (Info)
                </SelectItem>
                <SelectItem value="warn" className="text-xs">
                  Atenção (Warn)
                </SelectItem>
                <SelectItem value="critical" className="text-xs">
                  Crítico (Critical)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Usuário Responsável</Label>
            <Select value={userIdFilter} onValueChange={setUserIdFilter}>
              <SelectTrigger className="h-9 text-xs bg-background text-foreground border-input">
                <SelectValue placeholder="Todos os usuários" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                <SelectItem value="ALL" className="text-xs">
                  Todos os usuários
                </SelectItem>
                {usersList.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name} {u.email && u.email !== u.name ? `(${u.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela de Logs */}
      {loadingLogs ? (
        <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Carregando trilha de auditoria...</span>
        </div>
      ) : auditLogs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum registro de auditoria encontrado"
          description="Nenhum log corresponde aos critérios de busca ou filtros selecionados."
          nextStepGuide="Ajuste os filtros acima ou limpe-os para visualizar todos os eventos históricos da plataforma."
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Data/Hora (BRT)</th>
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Resumo da Ação</th>
                  <th className="px-4 py-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => {
                  const userDisplay =
                    log.expand?.user_id?.name ||
                    log.expand?.user_id?.email ||
                    log.user_id ||
                    'Sistema / Anônimo'
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                        {formatDateBRL(log.created, { includeTime: true })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderSeverityBadge(log.severity)}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {log.event_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap max-w-[150px] truncate">
                        {userDisplay}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{log.summary}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver JSON
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border bg-muted/20 text-xs">
              <span className="text-muted-foreground">
                Página {page} de {totalPages} ({totalLogs} eventos registrados)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => loadLogs(page - 1)}
                  disabled={page <= 1 || loadingLogs}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => loadLogs(page + 1)}
                  disabled={page >= totalPages || loadingLogs}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Detalhes do Log de Auditoria */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" />
              Detalhes do Evento de Auditoria
            </DialogTitle>
            <DialogDescription className="text-xs">
              ID do Registro: <code className="font-mono text-foreground">{selectedLog?.id}</code>
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tipo de Evento:</span>
                  <span className="font-mono font-medium text-foreground">
                    {selectedLog.event_type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Data/Hora (UTC):</span>
                  <span className="font-mono text-foreground">{selectedLog.created}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Entidade Afetada:</span>
                  <span className="font-medium text-foreground">
                    {selectedLog.entity || '—'}{' '}
                    {selectedLog.entity_id ? `(${selectedLog.entity_id})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Severidade:</span>
                  <span>{renderSeverityBadge(selectedLog.severity)}</span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] mb-1 font-semibold">
                  Resumo:
                </span>
                <p className="p-2.5 bg-background rounded border border-border text-foreground font-medium">
                  {selectedLog.summary}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px] mb-1 font-semibold">
                  Metadados e Payload JSON:
                </span>
                <pre className="p-3 bg-muted/60 rounded border border-border text-[11px] font-mono overflow-x-auto max-h-48 text-foreground">
                  {selectedLog.details
                    ? JSON.stringify(selectedLog.details, null, 2)
                    : '// Sem dados adicionais anexados'}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedLog(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
