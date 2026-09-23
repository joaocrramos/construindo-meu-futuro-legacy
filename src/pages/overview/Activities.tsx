import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrencyBRL, formatDateBRL } from '@/lib/formatters'
import {
  History,
  Plus,
  Loader2,
  ArrowUpDown,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Building2,
  Coins,
  Calendar,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  listMovements,
  formatQuantityE8,
  MOVEMENT_TYPE_LABELS,
  type MovementRecord,
  type MovementType,
} from '@/services/movements'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAssets, type AssetRecord } from '@/services/assets'
import { toast } from 'sonner'

export default function ActivitiesPage() {
  const [loading, setLoading] = React.useState(true)
  const [movements, setMovements] = React.useState<MovementRecord[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<string>('all')
  const [selectedAccount, setSelectedAccount] = React.useState<string>('all')

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [movData, accData, assetData] = await Promise.all([
        listMovements(),
        listAccounts(),
        listAssets(),
      ])

      setMovements(movData)
      setAccounts(accData)
      setAssets(assetData)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar atividades recentes.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const accountMap = React.useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const assetMap = React.useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])

  // Movimentações filtradas e ordenadas por data cronológica decrescente
  const filteredMovements = React.useMemo(() => {
    return movements
      .filter((mov) => {
        if (selectedType !== 'all' && mov.movement_type !== selectedType) {
          return false
        }
        if (selectedAccount !== 'all' && mov.account_id !== selectedAccount) {
          return false
        }
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim()
          const acc = mov.expand?.account_id || accountMap.get(mov.account_id)
          const ast = mov.expand?.asset_id || assetMap.get(mov.asset_id || '')
          const typeLabel = MOVEMENT_TYPE_LABELS[mov.movement_type]?.toLowerCase() || ''
          const accName = acc?.name?.toLowerCase() || ''
          const ticker = ast?.ticker?.toLowerCase() || ''
          const assetName = ast?.name?.toLowerCase() || ''
          const notes = mov.notes?.toLowerCase() || ''

          const matches =
            typeLabel.includes(term) ||
            accName.includes(term) ||
            ticker.includes(term) ||
            assetName.includes(term) ||
            notes.includes(term)

          if (!matches) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [movements, selectedType, selectedAccount, searchTerm, accountMap, assetMap])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Atividades Recentes"
          description="Linha do tempo cronológica de lançamentos, conciliações e eventos do patrimônio."
          icon={History}
          breadcrumbs={[
            { label: 'Visão Geral', href: '/dashboard' },
            { label: 'Atividades Recentes' },
          ]}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Carregando histórico de atividades...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasData = movements.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atividades Recentes"
        description="Linha do tempo cronológica de lançamentos, movimentações financeiras e eventos contábeis."
        icon={History}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Atividades Recentes' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/movements">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nova Movimentação
            </Link>
          </Button>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={History}
          title="Nenhuma atividade registrada na linha do tempo"
          description="Todas as ações de depósitos, compras de ativos, vendas e rendimentos recebidos aparecerão nesta linha do tempo contábil."
          nextStepGuide="Lance sua primeira movimentação financeira para iniciar o histórico de atividades da sua conta."
          actionLabel="Registrar Primeira Movimentação"
          actionHref="/wealth/movements"
          secondaryActionLabel="Ver Contas"
          secondaryActionHref="/wealth/accounts"
        />
      ) : (
        <div className="space-y-6">
          {/* Barra de Filtros e Busca */}
          <Card className="border-border/80">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ativo, conta ou nota..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tipo de Operação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos de operação</SelectItem>
                    {Object.entries(MOVEMENT_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filtrar por conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as contas</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Feed em Linha do Tempo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                Exibindo {filteredMovements.length} de {movements.length} registro(s)
              </span>
              <span>Ordenado por data decrescente</span>
            </div>

            {filteredMovements.length === 0 ? (
              <Card className="border-border/80 p-8 text-center text-xs text-muted-foreground">
                Nenhuma atividade encontrada com os filtros selecionados.
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredMovements.map((mov) => {
                  const acc = mov.expand?.account_id || accountMap.get(mov.account_id)
                  const ast = mov.expand?.asset_id || assetMap.get(mov.asset_id || '')
                  const isCredit = ['deposit', 'dividend', 'interest_on_capital', 'sell'].includes(
                    mov.movement_type,
                  )

                  return (
                    <Card
                      key={mov.id}
                      className="border-border/80 hover:border-border transition-colors bg-card"
                    >
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-full shrink-0 mt-0.5 ${
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">
                                {MOVEMENT_TYPE_LABELS[mov.movement_type] || mov.movement_type}
                              </span>
                              {ast?.ticker && (
                                <Badge variant="outline" className="text-[10px] font-mono py-0">
                                  {ast.ticker}
                                </Badge>
                              )}
                              {mov.is_reversed && (
                                <Badge variant="destructive" className="text-[10px] py-0">
                                  Estornada
                                </Badge>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                              {acc?.name || 'Conta Bancária'} &bull; Data: {formatDateBRL(mov.date)}
                              {mov.quantity_e8 ? (
                                <span> &bull; Qtd: {formatQuantityE8(mov.quantity_e8)}</span>
                              ) : null}
                            </p>

                            {mov.notes && (
                              <p className="text-[11px] text-foreground/80 italic mt-1">
                                &ldquo;{mov.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 sm:border-l sm:border-border/60 sm:pl-4">
                          <div
                            className={`font-mono font-bold text-sm ${
                              isCredit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-foreground'
                            }`}
                          >
                            {isCredit ? '+ ' : ''}
                            {formatCurrencyBRL(mov.net_amount_cents / 100)}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {mov.fees_cents || mov.taxes_cents ? (
                              <span>
                                Encargos:{' '}
                                {formatCurrencyBRL(
                                  ((mov.fees_cents || 0) + (mov.taxes_cents || 0)) / 100,
                                )}
                              </span>
                            ) : (
                              <span>Valor líquido</span>
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
