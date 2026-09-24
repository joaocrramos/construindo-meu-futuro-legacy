import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyBRL, formatDateBRL } from '@/lib/formatters'
import { Calendar, Plus, Loader2, Clock, Coins } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listPositions, type PositionRecord } from '@/services/positions'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAssets, type AssetRecord, ASSET_CLASS_LABELS } from '@/services/assets'
import { toast } from 'sonner'

export default function DueDatesOverviewPage() {
  const [loading, setLoading] = React.useState(true)
  const [positions, setPositions] = React.useState<PositionRecord[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [posData, accData, assetData] = await Promise.all([
        listPositions(),
        listAccounts(),
        listAssets(),
      ])

      setPositions(posData)
      setAccounts(accData)
      setAssets(assetData)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao carregar vencimentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const accountMap = React.useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const assetMap = React.useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])

  // Filtra e classifica posições que possuem data de vencimento registrada (diretamente na posição ou pelo ativo cadastrado)
  const maturitiesList = React.useMemo(() => {
    const today = new Date()
    const nowYear = today.getFullYear()
    const nowMonth = today.getMonth() + 1
    const nowDay = today.getDate()
    const nowPad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const nowStr = `${nowYear}-${nowPad(nowMonth)}-${nowPad(nowDay)}`
    const nowDate = new Date(nowYear, nowMonth - 1, nowDay)

    const list = positions
      .filter((p) => {
        const ast = p.expand?.asset_id || assetMap.get(p.asset_id)
        const effectiveDueDate = p.maturity_date || ast?.due_date
        return Boolean(effectiveDueDate) && p.quantity_e8 > 0
      })
      .map((p) => {
        const acc = p.expand?.account_id || accountMap.get(p.account_id)
        const ast = p.expand?.asset_id || assetMap.get(p.asset_id)
        const rawMatDate = (p.maturity_date || ast?.due_date || '').trim()
        const matMatch = rawMatDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
        const matDate = matMatch
          ? `${matMatch[1]}-${matMatch[2]}-${matMatch[3]}`
          : rawMatDate.slice(0, 10)
        const isExpired = matDate < nowStr

        let daysRemaining = 0
        if (matMatch) {
          const mYear = Number.parseInt(matMatch[1], 10)
          const mMonth = Number.parseInt(matMatch[2], 10)
          const mDay = Number.parseInt(matMatch[3], 10)
          const targetDate = new Date(mYear, mMonth - 1, mDay)
          const deltaMs = targetDate.getTime() - nowDate.getTime()
          daysRemaining = Math.round(deltaMs / (1000 * 60 * 60 * 24))
        }

        const effectiveIndexer = p.indexer || ast?.indexer_rate || '—'

        return {
          id: p.id,
          maturityDate: matDate,
          isExpired,
          daysRemaining,
          accountName: acc?.name || 'Conta',
          ticker: ast?.ticker || 'Ativo',
          assetName: ast?.name || '',
          assetClass: ast?.asset_class ? ASSET_CLASS_LABELS[ast.asset_class] : '—',
          indexer: effectiveIndexer,
          quantityE8: p.quantity_e8,
          costCents: p.total_cost_cents || 0,
        }
      })

    // Ordena por data de vencimento crescente (os mais próximos primeiro)
    return list.sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
  }, [positions, accountMap, assetMap])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Próximos Vencimentos"
          description="Cronograma integrado de resgates, vencimentos de Renda Fixa, proventos e obrigações patrimoniais."
          icon={Calendar}
          breadcrumbs={[
            { label: 'Visão Geral', href: '/dashboard' },
            { label: 'Próximos Vencimentos' },
          ]}
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Consultando datas de liquidação e títulos...</p>
          </div>
        </div>
      </div>
    )
  }

  const hasData = maturitiesList.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Próximos Vencimentos"
        description="Cronograma integrado de liquidação e vencimento de títulos e posições de renda fixa."
        icon={Calendar}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Próximos Vencimentos' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/positions">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Gestão de Custódia
            </Link>
          </Button>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={Calendar}
          title="Sem vencimentos agendados para os próximos meses"
          description="Nenhum título, contrato ou obrigação com data de liquidação futura foi identificado nos seus registros de custódia."
          nextStepGuide="Ao cadastrar títulos de renda fixa com data de vencimento na aba de Posições, o cronograma sincronizará automaticamente neste painel."
          actionLabel="Ver Posições em Custódia"
          actionHref="/wealth/positions"
          secondaryActionLabel="Lançar Movimentação"
          secondaryActionHref="/wealth/movements"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Títulos com Vencimento
                </CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading">{maturitiesList.length}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ativos cadastrados com liquidação futura
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Próximo Vencimento
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading">
                  {formatDateBRL(maturitiesList[0].maturityDate)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {maturitiesList[0].ticker} ({maturitiesList[0].daysRemaining} dias restantes)
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Capital em Vencimento (Custo)
                </CardTitle>
                <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyBRL(maturitiesList.reduce((acc, m) => acc + m.costCents, 0) / 100)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Volume de principal alocado
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Cronograma de Liquidação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Ativo / Ticker</th>
                      <th className="px-4 py-3">Conta de Custódia</th>
                      <th className="px-4 py-3">Indexador</th>
                      <th className="px-4 py-3">Data de Vencimento</th>
                      <th className="px-4 py-3 text-right">Custo Alocado</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {maturitiesList.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <span>{m.ticker}</span>
                              <span className="block text-[11px] font-normal text-muted-foreground">
                                {m.assetName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.accountName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.indexer}</td>
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          {formatDateBRL(m.maturityDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                          {formatCurrencyBRL(m.costCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.isExpired ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Vencido
                            </Badge>
                          ) : m.daysRemaining <= 30 ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10"
                            >
                              Em {m.daysRemaining} dias
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Em {m.daysRemaining} dias
                            </Badge>
                          )}
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
