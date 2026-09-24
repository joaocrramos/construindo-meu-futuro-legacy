import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Trash2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { formatDateBRL } from '@/lib/formatters'
import { toast } from 'sonner'
import { resetBusinessData } from '@/services/adminReset'

const CONFIRMATION_PHRASE = 'LIMPAR AMBIENTE DESENVOLVIMENTO'

interface ResetAuditInfo {
  executedAt: string | null
  authorizedBy: string | null
  summary: string | null
  cleanedCollections: string[]
}

export default function AdminResetDevPage() {
  const [loading, setLoading] = React.useState(true)
  const [resetInfo, setResetInfo] = React.useState<ResetAuditInfo | null>(null)
  const [recordsCount, setRecordsCount] = React.useState<Record<string, number>>({})

  // Modal de alto atrito
  const [modalOpen, setModalOpen] = React.useState(false)
  const [phraseInput, setPhraseInput] = React.useState('')
  const [executing, setExecuting] = React.useState(false)

  const loadStatus = React.useCallback(async () => {
    setLoading(true)
    try {
      // 1. Buscar último registro de auditoria com SYSTEM_RESET
      try {
        const auditRes = await pb.collection('audit_logs').getList(1, 1, {
          filter: 'event_type = "SYSTEM_RESET"',
          sort: '-created',
        })

        if (auditRes.items.length > 0) {
          const item = auditRes.items[0]
          const details = (item.details || {}) as {
            executed_at?: string
            authorized_by?: string
            cleaned_collections?: string[]
          }
          setResetInfo({
            executedAt: details.executed_at || item.created,
            authorizedBy: details.authorized_by || 'Administrador',
            summary:
              item.summary ||
              'Limpeza total da base executada com sucesso para início de produção.',
            cleanedCollections: details.cleaned_collections || [
              'institutions',
              'accounts',
              'assets',
              'positions',
              'movements',
              'account_balances',
              'portfolios',
              'invitations',
              'alerts',
            ],
          })
        } else {
          setResetInfo(null)
        }
      } catch (auditErr) {
        console.warn('Erro ao consultar audit_logs para SYSTEM_RESET:', auditErr)
      }

      // 2. Contar registros atuais nas coleções de negócio
      const collectionsToCheck = [
        'institutions',
        'accounts',
        'assets',
        'positions',
        'movements',
        'account_balances',
        'portfolios',
        'invitations',
        'alerts',
      ]

      const counts: Record<string, number> = {}
      for (const col of collectionsToCheck) {
        try {
          const res = await pb.collection(col).getList(1, 1)
          counts[col] = res.totalItems
        } catch {
          counts[col] = 0
        }
      }
      setRecordsCount(counts)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const totalBusinessRecords = Object.values(recordsCount).reduce((acc, curr) => acc + curr, 0)

  const handleOpenModal = () => {
    setPhraseInput('')
    setModalOpen(true)
  }

  const handleExecuteReset = async () => {
    if (phraseInput.trim() !== CONFIRMATION_PHRASE) {
      toast.error('Frase de segurança incorreta', {
        description: `Digite exatamente "${CONFIRMATION_PHRASE}".`,
      })
      return
    }

    setExecuting(true)
    try {
      const currentAuth = pb.authStore.record
      if (!currentAuth || currentAuth.role !== 'admin') {
        throw new Error('Apenas administradores ativos podem executar a limpeza da base.')
      }

      const result = await resetBusinessData(phraseInput.trim())
      const totalDeleted = Object.values(result.deleted_counts || {}).reduce(
        (acc, curr) => acc + curr,
        0,
      )

      toast.success('Limpeza concluída', {
        description: `${totalDeleted} registros removidos. Evento SYSTEM_RESET registrado na auditoria.`,
      })
      setModalOpen(false)
      loadStatus()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err instanceof Error ? err.message : 'Falha ao processar solicitação')
      toast.error('Erro na operação', { description: msg })
    } finally {
      setExecuting(false)
    }
  }

  const isPhraseMatched = phraseInput.trim() === CONFIRMATION_PHRASE

  return (
    <div className="space-y-6">
      <PageHeader
        title="Limpeza da Base para Início de Produção"
        description="Rotina de higienização total de dados de negócio e prontidão para entrada em produção."
        icon={Trash2}
        badge={resetInfo ? 'Ambiente Limpo' : 'Governança Ativa'}
        breadcrumbs={[
          { label: 'Administração', href: '/admin/users' },
          { label: 'Limpeza de Produção' },
        ]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs"
            onClick={loadStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        }
      />

      {/* Banner de status do Reset Real */}
      {resetInfo ? (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-sm font-semibold flex items-center gap-2">
            Base limpa com sucesso — Ambiente pronto para produção
            <Badge className="bg-emerald-600 text-white border-0 text-[10px]">Higienizado</Badge>
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed mt-1 space-y-1">
            <p>
              A limpeza total de dados foi executada em{' '}
              <strong>
                {resetInfo.executedAt
                  ? formatDateBRL(resetInfo.executedAt, { includeTime: true })
                  : 'data recente'}
              </strong>{' '}
              e autorizada por <strong>{resetInfo.authorizedBy}</strong>.
            </p>
            <p className="text-[11px] opacity-90">
              Registrado de forma indelével na trilha de auditoria sob o evento{' '}
              <code className="font-mono font-bold bg-emerald-500/20 px-1 py-0.5 rounded">
                SYSTEM_RESET
              </code>
              . A coleção de usuários (<code>users</code>) e as credenciais de acesso foram
              integralmente preservadas.
            </p>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert
          variant="destructive"
          className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-sm font-semibold">Status da Base de Dados</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed mt-1">
            Operação de alto atrito. Qualquer limpeza subsequente exige confirmação explícita de
            segurança.
          </AlertDescription>
        </Alert>
      )}

      {/* Grid de Estado das Coleções */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Estado Atual das Coleções de Negócio
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {loading
                ? 'Verificando...'
                : totalBusinessRecords === 0
                  ? '0 registros de teste (100% Zerado)'
                  : `${totalBusinessRecords} registros ativos`}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Contagem em tempo real dos registros de dados nas coleções do banco PocketBase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'institutions', label: 'Instituições' },
              { id: 'accounts', label: 'Contas' },
              { id: 'assets', label: 'Ativos' },
              { id: 'positions', label: 'Posições' },
              { id: 'movements', label: 'Movimentações' },
              { id: 'account_balances', label: 'Saldos de Caixa' },
              { id: 'portfolios', label: 'Carteiras' },
              { id: 'invitations', label: 'Convites' },
              { id: 'alerts', label: 'Alertas' },
            ].map((col) => {
              const count = recordsCount[col.id] ?? 0
              return (
                <div
                  key={col.id}
                  className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">{col.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{col.id}</p>
                  </div>
                  <Badge
                    variant={count === 0 ? 'secondary' : 'destructive'}
                    className={
                      count === 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono text-xs'
                        : 'font-mono text-xs'
                    }
                  >
                    {loading ? '...' : `${count} reg`}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Governança de Alto Atrito */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Governança e Confirmação de Alto Atrito (ADR-022)
          </CardTitle>
          <CardDescription className="text-xs">
            Salvaguarda contra execuções acidentais: o botão de reset nunca é acionado com um
            clique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
          <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/60 space-y-2">
            <p className="font-semibold text-foreground">Diretrizes de Segurança em Produção:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Exige papel de <strong>Administrador Ativo</strong> devidamente autenticado.
              </li>
              <li>
                Só funciona no ambiente em que o servidor tiver{' '}
                <code className="font-mono">ALLOW_DATA_RESET=true</code>.
              </li>
              <li>
                Exige digitação estrita da frase de confirmação de segurança:{' '}
                <code className="text-rose-500 font-mono font-bold bg-muted px-1.5 py-0.5 rounded">
                  {CONFIRMATION_PHRASE}
                </code>
                .
              </li>
              <li>
                <strong>Preservação Absoluta Garantida:</strong> Usuários cadastrados (
                <code>users</code>), superusuários, schema relacional, migrations aplicadas e hooks
                do servidor.
              </li>
              <li>
                Trilha de auditoria indelével em <code>audit_logs</code> registrando quem, quando e
                o escopo da operação.
              </li>
            </ul>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="destructive"
              className="h-10 text-xs font-semibold"
              onClick={handleOpenModal}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Executar Nova Limpeza de Alto Atrito
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {totalBusinessRecords === 0
                ? 'Base já está 100% higienizada para início de produção.'
                : 'A base contém registros ativos que serão expurgados após confirmação.'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Alto Atrito */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md border-destructive/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Confirmação de Alto Atrito — Limpeza de Base
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground space-y-2 pt-2">
              <span className="block text-foreground font-semibold">
                ATENÇÃO: OPERAÇÃO DESTRUTIVA E IRREVERSÍVEL!
              </span>
              <span className="block leading-relaxed">
                Esta ação expurga todos os dados cadastrais, movimentações, posições, saldos,
                carteiras e alertas do banco de dados para todas as entidades de negócio.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive space-y-1">
              <p className="font-semibold">O que é preservado:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Coleção de usuários (usuários e superusuários permanecem intactos).</li>
                <li>Estrutura de tabelas (schema) e migrations aplicadas.</li>
                <li>Registro permanente do evento na trilha de auditoria.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPhraseInput" className="text-xs font-semibold text-foreground">
                Para confirmar, digite exatamente a frase abaixo:{' '}
                <span className="font-mono text-primary font-bold">{CONFIRMATION_PHRASE}</span>
              </Label>
              <Input
                id="confirmPhraseInput"
                placeholder={CONFIRMATION_PHRASE}
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                className="h-9 text-xs font-mono border-destructive/40 focus-visible:ring-destructive"
                autoComplete="off"
                disabled={executing}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false)
                setPhraseInput('')
              }}
              disabled={executing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!isPhraseMatched || executing}
              onClick={handleExecuteReset}
            >
              {executing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar e Executar Limpeza'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
