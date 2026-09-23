import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import {
  Layers,
  Loader2,
  Coins,
  ArrowUpDown,
  Wallet,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatCurrencyBRL } from '@/lib/formatters'
import {
  listPositions,
  derivePositionsFromMovements,
  type PositionRecord,
  type DerivedPosition,
} from '@/services/positions'
import { listMovements, formatQuantityE8, type MovementRecord } from '@/services/movements'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAssets, type AssetRecord, ASSET_CLASS_LABELS } from '@/services/assets'
import { listAccountBalances, type AccountBalanceRecord } from '@/services/accountBalances'

export default function PositionsPage() {
  const [positions, setPositions] = React.useState<PositionRecord[]>([])
  const [derivedPositions, setDerivedPositions] = React.useState<DerivedPosition[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [, setMovements] = React.useState<MovementRecord[]>([])
  const [accountBalances, setAccountBalances] = React.useState<AccountBalanceRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [posData, movData, accData, assetData, balData] = await Promise.all([
        listPositions(),
        listMovements(),
        listAccounts(),
        listAssets(),
        listAccountBalances(),
      ])

      setPositions(posData)
      setMovements(movData)
      setAccounts(accData)
      setAssets(assetData)
      setAccountBalances(balData)

      // Se a collection positions estiver vazia no momento (backend-only recalcs pendentes),
      // deriva posições em memória a partir dos lançamentos contábeis de movements
      const derived = derivePositionsFromMovements(movData, accData, assetData)
      setDerivedPositions(derived)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Falha ao buscar posições de custódia.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Determina fonte de exibição: records salvos no PocketBase ou derivadas das movimentações
  const hasDbPositions = positions.length > 0
  const totalPositionsCount = hasDbPositions ? positions.length : derivedPositions.length

  // Total consolidado em custo de aquisição
  const totalPortfolioCostCents = hasDbPositions
    ? positions.reduce((acc, p) => acc + (p.total_cost_cents || 0), 0)
    : derivedPositions.reduce((acc, p) => acc + p.total_cost_cents, 0)

  // Saldo total em dinheiro em caixa disponível (todas as contas)
  const totalCashCents = accountBalances.reduce((acc, b) => acc + (b.balance_cents || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posições em Custódia"
        description="Custódia consolidada derivada do livro-razão contábil. Quantidade na escala e8 e preço médio ponderado."
        icon={Layers}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Posições' }]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <a href="/wealth/movements">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              Lançar Movimentação
            </a>
          </Button>
        }
      />

      {/* Resumo consolidado */}
      {(totalPositionsCount > 0 || accountBalances.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Total de Posições Ativas</p>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {totalPositionsCount}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">
              Dinheiro em Caixa Disponível
            </p>
            <p
              className={`text-2xl font-bold font-mono mt-1 ${
                totalCashCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
              }`}
            >
              {formatCurrencyBRL(totalCashCents / 100)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">
              Custo Total em Ativos (Entrada)
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-primary">
              {formatCurrencyBRL(totalPortfolioCostCents / 100)}
            </p>
          </div>
        </div>
      )}

      {/* Seção Destacada: Dinheiro em Caixa por Conta */}
      {accountBalances.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground">
                Dinheiro em Caixa (Disponível para Transações)
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Alimentado por depósitos, vendas de ativos e dividendos recebidos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accountBalances.map((bal) => {
              const acc = bal.expand?.account_id || accounts.find((a) => a.id === bal.account_id)
              const balanceBrl = (bal.balance_cents || 0) / 100

              return (
                <div
                  key={bal.id}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 p-3.5 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {acc?.name || 'Conta Bancária'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Moeda: {bal.currency || 'BRL'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]"
                    >
                      Em Caixa
                    </Badge>
                  </div>

                  <div className="mt-3 pt-2 border-t border-emerald-500/15 flex items-baseline justify-between">
                    <span className="text-[11px] text-muted-foreground">Saldo Líquido</span>
                    <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {bal.currency === 'USD'
                        ? `$ ${balanceBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : formatCurrencyBRL(balanceBrl)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando posições em custódia...</span>
        </div>
      ) : totalPositionsCount === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhuma posição em custódia encontrada"
          description="As posições são derivadas diretamente das movimentações de compra e venda registradas no livro-razão contábil."
          nextStepGuide="Lance uma compra de ativo na tela de movimentações para gerar automaticamente a posição com preço médio calculado."
          actionLabel="Ir para Movimentações"
          onAction={() => {
            window.location.href = '/wealth/movements'
          }}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Ticker / Ativo</th>
                  <th className="px-4 py-3">Conta de Custódia</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3 text-right">Quantidade (e8)</th>
                  <th className="px-4 py-3 text-right">Preço Médio</th>
                  <th className="px-4 py-3 text-right">Custo Total</th>
                  <th className="px-4 py-3 text-center">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hasDbPositions
                  ? positions.map((pos) => {
                      const acc =
                        pos.expand?.account_id || accounts.find((a) => a.id === pos.account_id)
                      const ast = pos.expand?.asset_id || assets.find((a) => a.id === pos.asset_id)

                      return (
                        <tr key={pos.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div>
                                <span>{ast?.ticker || 'Ativo'}</span>
                                <span className="block text-[11px] font-normal text-muted-foreground">
                                  {ast?.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{acc?.name || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {ast?.asset_class ? ASSET_CLASS_LABELS[ast.asset_class] : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                            {formatQuantityE8(pos.quantity_e8)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrencyBRL(pos.average_price_cents / 100)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                            {formatCurrencyBRL(pos.total_cost_cents / 100)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="text-[10px] border-border">
                              Recalculado
                            </Badge>
                          </td>
                        </tr>
                      )
                    })
                  : derivedPositions.map((pos) => (
                      <tr key={pos.key} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <span>{pos.asset?.ticker || 'Ativo'}</span>
                              <span className="block text-[11px] font-normal text-muted-foreground">
                                {pos.asset?.name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {pos.account?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {pos.asset?.asset_class ? ASSET_CLASS_LABELS[pos.asset.asset_class] : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                          {formatQuantityE8(pos.quantity_e8)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {formatCurrencyBRL(pos.average_price_cents / 100)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatCurrencyBRL(pos.total_cost_cents / 100)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/30 text-primary bg-primary/5"
                          >
                            Derivado ({pos.movementsCount} movs)
                          </Badge>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
