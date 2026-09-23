import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import {
  HardDrive,
  Database,
  Plus,
  RefreshCw,
  Download,
  RotateCcw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  listBackups,
  createBackup,
  downloadBackup,
  restoreBackup,
  type BackupItem,
} from '@/services/backups'
import { formatDateBRL } from '@/lib/formatters'

export default function AdminBackupsPage() {
  const [backups, setBackups] = React.useState<BackupItem[]>([])
  const [loadingBackups, setLoadingBackups] = React.useState(true)
  const [downloadingKey, setDownloadingKey] = React.useState<string | null>(null)

  // Modal: Criar Backup
  const [creatingBackup, setCreatingBackup] = React.useState(false)
  const [backupModalOpen, setBackupModalOpen] = React.useState(false)
  const [customBackupName, setCustomBackupName] = React.useState('')

  // Modal: Restaurar Backup (Alto Atrito)
  const [restoreModalOpen, setRestoreModalOpen] = React.useState(false)
  const [targetRestoreKey, setTargetRestoreKey] = React.useState<string | null>(null)
  const [confirmationInput, setConfirmationInput] = React.useState('')
  const [restoring, setRestoring] = React.useState(false)

  // Carregar lista de backups
  const loadBackupsData = React.useCallback(async () => {
    setLoadingBackups(true)
    try {
      const res = await listBackups()
      setBackups(res.items || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao buscar backups da instância'
      toast.error('Erro ao listar backups', { description: message })
    } finally {
      setLoadingBackups(false)
    }
  }, [])

  React.useEffect(() => {
    loadBackupsData()
  }, [loadBackupsData])

  // Formatação de bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Disparar Download
  const handleDownloadBackup = async (key: string) => {
    if (downloadingKey) return
    setDownloadingKey(key)
    try {
      const blob = await downloadBackup(key)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = key
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Download concluído', {
        description: `O arquivo ${key} foi baixado com sucesso.`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao baixar arquivo de backup'
      toast.error('Erro no download do backup', { description: message })
    } finally {
      setDownloadingKey(null)
    }
  }

  // Disparar Criação de Backup
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingBackup(true)
    try {
      const name = customBackupName.trim() || undefined
      const res = await createBackup(name)
      toast.success('Backup gerado com sucesso!', {
        description: `Arquivo: ${res.name}. Registrado na trilha de auditoria.`,
      })
      setBackupModalOpen(false)
      setCustomBackupName('')
      loadBackupsData()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao iniciar backup do banco de dados'
      toast.error('Falha na criação do backup', { description: message })
    } finally {
      setCreatingBackup(false)
    }
  }

  // Abrir modal de restore
  const openRestoreModal = (key: string) => {
    setTargetRestoreKey(key)
    setConfirmationInput('')
    setRestoreModalOpen(true)
  }

  // Disparar Restauração (Alto Atrito)
  const handleExecuteRestore = async () => {
    if (!targetRestoreKey) return
    if (confirmationInput.trim() !== targetRestoreKey.trim()) {
      toast.error('Confirmação inválida', {
        description: 'Digite exatamente o nome do snapshot para liberar a restauração.',
      })
      return
    }

    setRestoring(true)
    try {
      const res = await restoreBackup(targetRestoreKey)
      toast.success('Restauração iniciada com sucesso!', {
        description:
          res.message ||
          'O banco ativo foi restaurado. A instância está reiniciando e será restabelecida em instantes.',
      })
      setRestoreModalOpen(false)
      setConfirmationInput('')
      setTargetRestoreKey(null)

      // Recarregar lista após pequeno intervalo para permitir que o daemon responda
      setTimeout(() => {
        loadBackupsData()
      }, 3000)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha ao executar a restauração do snapshot'
      toast.error('Erro na restauração do backup', { description: message })
    } finally {
      setRestoring(false)
    }
  }

  const isConfirmationMatched =
    Boolean(targetRestoreKey) && confirmationInput.trim() === targetRestoreKey?.trim()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & Recuperação (B2)"
        description="Gestão de snapshots completos do banco de dados SQLite e restauração de segurança da plataforma."
        icon={HardDrive}
        badge="Governança & B2"
        breadcrumbs={[
          { label: 'Administração', href: '/admin/users' },
          { label: 'Backup & Restore' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs"
              onClick={loadBackupsData}
              disabled={loadingBackups}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingBackups ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" className="h-9 text-xs" onClick={() => setBackupModalOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Criar Backup Agora
            </Button>
          </div>
        }
      />

      {/* Card Explicativo B2 & Governança */}
      <div className="p-4 rounded-lg border border-border bg-card/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">
              Mecanismo de Backup & Snapshot PocketBase (B2)
            </h3>
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
          >
            Nativo & Ativo
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Os backups criam um arquivo compactado (<code>.zip</code>) contendo o banco de dados
          SQLite completo (<code>data.db</code>) e todos os arquivos de upload armazenados. A
          geração e a restauração exigem privilégio de superusuário e são registradas de forma
          indelével na trilha de auditoria (<code>BACKUP_CREATED</code>,{' '}
          <code>BACKUP_DOWNLOADED</code> e <code>BACKUP_RESTORE_REQUESTED</code>).
        </p>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <strong>Aviso Crítico de Operação Destrutiva:</strong> A ação de restauração substitui
            integralmente os dados do banco atual pelo conteúdo do snapshot selecionado e reinicia o
            processo da instância. Para evitar restaurações acidentais, a confirmação exige
            digitação exata do nome do snapshot.
          </div>
        </div>
      </div>

      {/* Tabela de Backups */}
      {loadingBackups ? (
        <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Consultando backups do PocketBase...</span>
        </div>
      ) : backups.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="Nenhum arquivo de backup gerado ainda"
          description="Backups garantem a recuperação completa de desastres e salvaguardam todos os dados cadastrais e financeiros."
          nextStepGuide="Clique em 'Criar Backup Agora' para gerar o primeiro snapshot pontual do banco de dados PocketBase."
          actionLabel="Criar Primeiro Backup"
          onAction={() => setBackupModalOpen(true)}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Arquivo (Snapshot)</th>
                  <th className="px-4 py-3">Tamanho</th>
                  <th className="px-4 py-3">Data de Modificação</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Integridade</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {backups.map((b) => {
                  const isDownloadingThis = downloadingKey === b.key
                  return (
                    <tr key={b.key} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{b.key}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {formatBytes(b.size)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {formatDateBRL(b.modified, { includeTime: true })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]">
                          Disponível
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Validado
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-primary hover:bg-primary/10 border-primary/20"
                                  onClick={() => handleDownloadBackup(b.key)}
                                  disabled={Boolean(downloadingKey) || restoring}
                                  aria-label={`Baixar ${b.key}`}
                                >
                                  {isDownloadingThis ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  ) : (
                                    <Download className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Baixar arquivo de snapshot</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openRestoreModal(b.key)}
                                  disabled={restoring}
                                  aria-label={`Restaurar ${b.key}`}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Restaurar este snapshot</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Criar Backup */}
      <Dialog open={backupModalOpen} onOpenChange={setBackupModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Backup do PocketBase (B2)</DialogTitle>
            <DialogDescription className="text-xs">
              Será criado um snapshot pontual completo contendo todas as tabelas (
              <code>data.db</code>) e arquivos de armazenamento da instância.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBackup} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="backupName" className="text-xs font-semibold">
                Nome Personalizado (opcional)
              </Label>
              <Input
                id="backupName"
                placeholder="Ex: snapshot_rebalanceamento"
                value={customBackupName}
                onChange={(e) => setCustomBackupName(e.target.value)}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Se deixado em branco, o sistema gerará automaticamente com timestamp UTC (
                <code>backup_AAAAMMDD_HHMMSS.zip</code>).
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBackupModalOpen(false)}
                disabled={creatingBackup}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingBackup}>
                {creatingBackup ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Gerando Snapshot...
                  </>
                ) : (
                  'Iniciar Backup Agora'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmação de Alto Atrito para RESTORE */}
      <Dialog
        open={restoreModalOpen}
        onOpenChange={(open) => {
          if (!restoring) {
            setRestoreModalOpen(open)
            if (!open) {
              setTargetRestoreKey(null)
              setConfirmationInput('')
            }
          }
        }}
      >
        <DialogContent className="max-w-md border-destructive/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Confirmar Restauração de Snapshot
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground space-y-2 pt-2">
              <span className="block text-foreground font-semibold">
                ATENÇÃO: ESTA AÇÃO É DESTRUTIVA E IRREVERSÍVEL!
              </span>
              <span className="block leading-relaxed">
                A restauração substituirá <strong>todos os dados ativos</strong> do banco de dados
                pelo estado exato contido no snapshot{' '}
                <code className="font-mono font-bold text-foreground bg-muted px-1 py-0.5 rounded">
                  {targetRestoreKey}
                </code>{' '}
                e reiniciará a instância do PocketBase imediatamente.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive space-y-1">
              <p className="font-semibold">O que acontecerá após a confirmação:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>O evento de auditoria será registrado antes do reinício.</li>
                <li>Qualquer alteração posterior à data do snapshot será sobrescrita.</li>
                <li>A conexão com o servidor será temporariamente reiniciada.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmKeyInput" className="text-xs font-semibold text-foreground">
                Para confirmar, digite exatamente o nome do snapshot abaixo:{' '}
                <span className="font-mono text-primary font-bold">{targetRestoreKey}</span>
              </Label>
              <Input
                id="confirmKeyInput"
                placeholder={targetRestoreKey || ''}
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                className="h-9 text-xs font-mono border-destructive/40 focus-visible:ring-destructive"
                autoComplete="off"
                disabled={restoring}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRestoreModalOpen(false)
                setTargetRestoreKey(null)
                setConfirmationInput('')
              }}
              disabled={restoring}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!isConfirmationMatched || restoring}
              onClick={handleExecuteRestore}
            >
              {restoring ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Restaurando e Reiniciando...
                </>
              ) : (
                'Confirmar Restauração'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
