import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { MultiSelectFilter, type MultiSelectOption } from '@/components/MultiSelectFilter'
import {
  Layers,
  Loader2,
  Coins,
  ArrowUpDown,
  Wallet,
  Building2,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  FilterX,
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
import {
  listAssets,
  type AssetRecord,
  ASSET_CLASS_LABELS,
  type AssetClass,
} from '@/services/assets'
import { listAccountBalances, type AccountBalanceRecord } from '@/services/accountBalances'
import { listQuotes, refreshQuotes, getQuoteForTicker, type QuoteRecord } from '@/services/quotes'
import { formatDateBRL } from '@/lib/formatters'
import { RefreshCw, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NormalizedPositionItem {
  id: string
  accountId: string
  accountName: string
  assetId: string
  ticker: string
  assetName: string
  assetClass: AssetClass | 'other'
  assetClassLabel: string
  quantityE8: number
  averagePriceCents: number
  totalCostCents: number
  maturityDate?: string
  indexer?: string
  // Dados de cotação / valor de mercado
  currentPriceCents?: number
  marketValueCents: number
  hasQuote: boolean
  quoteDate?: string
  currency: string
}

export default function PositionsPage() {
  const [positions, setPositions] = React.useState<PositionRecord[]>([])
  const [derivedPositions, setDerivedPositions] = React.useState<DerivedPosition[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [, setMovements] = React.useState<MovementRecord[]>([])
  const [accountBalances, setAccountBalances] = React.useState<AccountBalanceRecord[]>([])
  const [quotes, setQuotes] = React.useState<QuoteRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshingQuotes, setRefreshingQuotes] = React.useState(false)

  // Modos de visualização: 'flat' (tabela única) ou 'grouped' (agrupado por classe de ativo)
  const [viewMode, setViewMode] = React.useState<'flat' | 'grouped'>('flat')

  // Estado das seções colapsadas no modo agrupado (chave = classKey, valor = boolean isCollapsed)
  const [collapsedClasses, setCollapsedClasses] = React.useState<Record<string, boolean>>({})

  // Filtros de múltipla escolha
  const [selectedAssetIds, setSelectedAssetIds] = React.useState<string[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = React.useState<string[]>([])

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [posData, movData, accData, assetData, balData, quotesData] = await Promise.all([
        listPositions(),
        listMovements(),
        listAccounts(),
        listAssets(),
        listAccountBalances(),
        listQuotes(),
      ])

      setPositions(posData)
      setMovements(movData)
      setAccounts(accData)
      setAssets(assetData)
      setAccountBalances(balData)
      setQuotes(quotesData)

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

  const handleRefreshQuotes = async () => {
    try {
      setRefreshingQuotes(true)
      const res = await refreshQuotes()
      toast.success(
        res.updated_count > 0
          ? `Cotações atualizadas: ${res.updated_count} ativos sincronizados via brapi.dev.`
          : 'Cotações verificadas com sucesso.',
      )
      // Recarrega cotações
      const newQuotes = await listQuotes()
      setQuotes(newQuotes)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Falha ao atualizar cotações com brapi.dev.')
    } finally {
      setRefreshingQuotes(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Normalização unificada para trabalhar tanto com records salvos no PB quanto com posições derivadas
  const hasDbPositions = positions.length > 0
  const normalizedPositions: NormalizedPositionItem[] = React.useMemo(() => {
    const accMap = new Map<string, AccountRecord>(accounts.map((a) => [a.id, a]))
    const astMap = new Map<string, AssetRecord>(assets.map((a) => [a.id, a]))

    // Classes que utilizam cotação de mercado para cálculo do valor de mercado
    const marketValueClasses: string[] = ['equities', 'real_estate_funds', 'crypto']

    const calculateMarketValue = (
      rawClass: string,
      ticker: string,
      qtyE8: number,
      costCents: number,
      curr: string,
    ) => {
      // Renda fixa continua estritamente por valor investido/custo
      if (rawClass === 'fixed_income') {
        return {
          currentPriceCents: undefined,
          marketValueCents: costCents,
          hasQuote: false,
          quoteDate: undefined,
          currency: curr,
        }
      }

      // Se for classe de mercado com ticker cadastrado
      const q = ticker ? getQuoteForTicker(quotes, ticker) : undefined
      if (q && q.price_cents > 0) {
        // quantidade decimal = qtyE8 / 1e8
        // valor de mercado = (qtyE8 / 1e8) * (q.price_cents)
        const mvCents = Math.round((qtyE8 / 1e8) * q.price_cents)
        return {
          currentPriceCents: q.price_cents,
          marketValueCents: mvCents,
          hasQuote: true,
          quoteDate: q.quoted_at || q.updated,
          currency: q.currency || curr,
        }
      }

      // Se for equities/real_estate_funds/crypto e não tiver cotação: fallback custo
      return {
        currentPriceCents: undefined,
        marketValueCents: costCents,
        hasQuote: false,
        quoteDate: undefined,
        currency: curr,
      }
    }

    if (hasDbPositions) {
      return positions.map((p) => {
        const acc = p.expand?.account_id || accMap.get(p.account_id)
        const ast = p.expand?.asset_id || astMap.get(p.asset_id)
        const rawClass = (ast?.asset_class || 'other') as AssetClass
        const ticker = ast?.ticker || ''
        const curr = (ast?.currency || acc?.currency || 'BRL').toUpperCase()
        const mvInfo = calculateMarketValue(
          rawClass,
          ticker,
          p.quantity_e8,
          p.total_cost_cents || 0,
          curr,
        )

        return {
          id: p.id,
          accountId: p.account_id,
          accountName: acc?.name || 'Conta de Custódia',
          assetId: p.asset_id,
          ticker: ticker || 'Ativo',
          assetName: ast?.name || '',
          assetClass: rawClass,
          assetClassLabel: ASSET_CLASS_LABELS[rawClass] || 'Outro',
          quantityE8: p.quantity_e8,
          averagePriceCents: p.average_price_cents,
          totalCostCents: p.total_cost_cents || 0,
          maturityDate: p.maturity_date,
          indexer: p.indexer,
          ...mvInfo,
        }
      })
    }

    return derivedPositions.map((p) => {
      const acc = p.account || accMap.get(p.account_id)
      const ast = p.asset || astMap.get(p.asset_id)
      const rawClass = (ast?.asset_class || 'other') as AssetClass
      const ticker = ast?.ticker || ''
      const curr = (ast?.currency || acc?.currency || 'BRL').toUpperCase()
      const mvInfo = calculateMarketValue(rawClass, ticker, p.quantity_e8, p.total_cost_cents, curr)

      return {
        id: p.key,
        accountId: p.account_id,
        accountName: acc?.name || 'Conta de Custódia',
        assetId: p.asset_id,
        ticker: ticker || 'Ativo',
        assetName: ast?.name || '',
        assetClass: rawClass,
        assetClassLabel: ASSET_CLASS_LABELS[rawClass] || 'Outro',
        quantityE8: p.quantity_e8,
        averagePriceCents: p.average_price_cents,
        totalCostCents: p.total_cost_cents,
        ...mvInfo,
      }
    })
  }, [hasDbPositions, positions, derivedPositions, accounts, assets, quotes])

  // Opções para os filtros de múltipla escolha
  const assetFilterOptions: MultiSelectOption[] = React.useMemo(() => {
    // Lista todos os ativos que aparecem nas posições ou catálogo
    const map = new Map<string, MultiSelectOption>()
    for (const item of normalizedPositions) {
      if (!map.has(item.assetId)) {
        map.set(item.assetId, {
          value: item.assetId,
          label: item.ticker,
          description: item.assetName,
        })
      }
    }
    // Adiciona ativos do catálogo caso queiram filtrar
    for (const ast of assets) {
      if (!map.has(ast.id)) {
        map.set(ast.id, {
          value: ast.id,
          label: ast.ticker,
          description: ast.name,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [normalizedPositions, assets])

  const accountFilterOptions: MultiSelectOption[] = React.useMemo(() => {
    const map = new Map<string, MultiSelectOption>()
    for (const acc of accounts) {
      map.set(acc.id, {
        value: acc.id,
        label: acc.name,
      })
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [accounts])

  const classFilterOptions: MultiSelectOption[] = React.useMemo(() => {
    const classesSeen = new Set<string>()
    for (const item of normalizedPositions) {
      classesSeen.add(item.assetClass)
    }
    // Ordena conforme ASSET_CLASS_LABELS
    const keys = Object.keys(ASSET_CLASS_LABELS) as AssetClass[]
    return keys.map((key) => ({
      value: key,
      label: ASSET_CLASS_LABELS[key],
      badge: classesSeen.has(key) ? undefined : '0 posições',
    }))
  }, [normalizedPositions])

  // Aplicação dos filtros de múltipla escolha
  const filteredPositions = React.useMemo(() => {
    return normalizedPositions.filter((item) => {
      if (selectedAssetIds.length > 0 && !selectedAssetIds.includes(item.assetId)) {
        return false
      }
      if (selectedAccountIds.length > 0 && !selectedAccountIds.includes(item.accountId)) {
        return false
      }
      if (selectedClasses.length > 0 && !selectedClasses.includes(item.assetClass)) {
        return false
      }
      return true
    })
  }, [normalizedPositions, selectedAssetIds, selectedAccountIds, selectedClasses])

  // Agrupamento por classe de ativo
  const groupedPositions = React.useMemo(() => {
    const groups: {
      classKey: string
      classLabel: string
      items: NormalizedPositionItem[]
      subtotalCostCents: number
    }[] = []

    const map = new Map<string, NormalizedPositionItem[]>()
    for (const item of filteredPositions) {
      const k = item.assetClass
      if (!map.has(k)) {
        map.set(k, [])
      }
      map.get(k)!.push(item)
    }

    // Ordena grupos com base nas chaves de ASSET_CLASS_LABELS
    const orderedKeys = Object.keys(ASSET_CLASS_LABELS) as AssetClass[]
    for (const k of orderedKeys) {
      const items = map.get(k)
      if (items && items.length > 0) {
        const subtotal = items.reduce((acc, i) => acc + i.totalCostCents, 0)
        groups.push({
          classKey: k,
          classLabel: ASSET_CLASS_LABELS[k] || k,
          items,
          subtotalCostCents: subtotal,
        })
      }
    }

    // Ativos com classes não listadas em ASSET_CLASS_LABELS (se houver)
    for (const [k, items] of map.entries()) {
      if (!orderedKeys.includes(k as AssetClass) && items.length > 0) {
        const subtotal = items.reduce((acc, i) => acc + i.totalCostCents, 0)
        groups.push({
          classKey: k,
          classLabel: k,
          items,
          subtotalCostCents: subtotal,
        })
      }
    }

    return groups
  }, [filteredPositions])

  // Alternar colapso de uma classe
  const toggleGroupCollapse = (classKey: string) => {
    setCollapsedClasses((prev) => ({
      ...prev,
      [classKey]: !prev[classKey],
    }))
  }

  // Expandir / Retrair todas
  const collapseAllGroups = () => {
    const next: Record<string, boolean> = {}
    for (const g of groupedPositions) {
      next[g.classKey] = true
    }
    setCollapsedClasses(next)
  }

  const expandAllGroups = () => {
    setCollapsedClasses({})
  }

  // Limpar todos os filtros
  const clearFilters = () => {
    setSelectedAssetIds([])
    setSelectedAccountIds([])
    setSelectedClasses([])
  }

  const hasActiveFilters =
    selectedAssetIds.length > 0 || selectedAccountIds.length > 0 || selectedClasses.length > 0

  // Total consolidado em custo de aquisição e valor de mercado (filtrado e geral)
  const totalPositionsCount = filteredPositions.length
  const totalPortfolioCostCents = filteredPositions.reduce((acc, p) => acc + p.totalCostCents, 0)
  const totalPortfolioMarketValueCents = filteredPositions.reduce(
    (acc, p) => acc + p.marketValueCents,
    0,
  )

  // Saldo total em dinheiro em caixa disponível (todas as contas)
  const totalCashCents = accountBalances.reduce((acc, b) => acc + (b.balance_cents || 0), 0)

  // Última data de atualização de cotações encontrada
  const latestQuoteDate = React.useMemo(() => {
    if (quotes.length === 0) return null
    let latest: string | null = null
    for (const q of quotes) {
      const d = q.quoted_at || q.updated
      if (d && (!latest || d > latest)) {
        latest = d
      }
    }
    return latest
  }, [quotes])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posições em Custódia"
        description="Custódia consolidada derivada do livro-razão contábil. Quantidade na escala e8 e preço médio ponderado."
        icon={Layers}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Posições' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={handleRefreshQuotes}
              disabled={refreshingQuotes}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshingQuotes ? 'animate-spin' : ''}`} />
              {refreshingQuotes ? 'Atualizando...' : 'Atualizar Cotações'}
            </Button>
            <Button asChild size="sm" className="h-9 text-xs">
              <a href="/wealth/movements">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                Lançar Movimentação
              </a>
            </Button>
          </div>
        }
      />

      {/* Resumo consolidado */}
      {(normalizedPositions.length > 0 || accountBalances.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Total de Posições Ativas</p>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {totalPositionsCount}
              {hasActiveFilters && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  (de {normalizedPositions.length})
                </span>
              )}
            </p>
            {latestQuoteDate && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Cotações: {formatDateBRL(latestQuoteDate, { includeTime: true })}
              </p>
            )}
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
            <p className="text-[11px] text-muted-foreground mt-1">Liquidez imediata</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">
              Custo de Aquisição (Entrada)
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-muted-foreground">
              {formatCurrencyBRL(totalPortfolioCostCents / 100)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Preço médio ponderado</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">Valor de Mercado (Atual)</p>
            <p className="text-2xl font-bold font-mono mt-1 text-primary">
              {formatCurrencyBRL(totalPortfolioMarketValueCents / 100)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalPortfolioMarketValueCents >= totalPortfolioCostCents ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  +
                  {formatCurrencyBRL(
                    (totalPortfolioMarketValueCents - totalPortfolioCostCents) / 100,
                  )}
                </span>
              ) : (
                <span className="text-destructive font-semibold">
                  {formatCurrencyBRL(
                    (totalPortfolioMarketValueCents - totalPortfolioCostCents) / 100,
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Seção Destacada: Dinheiro em Caixa por Conta (funciona em ambos os modos de visualização) */}
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

      {/* Barra de Filtros Multi-Select e Toggle de Modo de Visualização */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
        {/* Filtros Multi-Select */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <MultiSelectFilter
            id="filter-asset"
            title="Ativo"
            placeholder="Todos os ativos"
            searchPlaceholder="Buscar por ticker ou nome..."
            options={assetFilterOptions}
            selectedValues={selectedAssetIds}
            onSelectionChange={setSelectedAssetIds}
          />

          <MultiSelectFilter
            id="filter-account"
            title="Conta"
            placeholder="Todas as contas"
            searchPlaceholder="Buscar conta..."
            options={accountFilterOptions}
            selectedValues={selectedAccountIds}
            onSelectionChange={setSelectedAccountIds}
          />

          <MultiSelectFilter
            id="filter-class"
            title="Classe"
            placeholder="Todas as classes"
            searchPlaceholder="Buscar classe..."
            options={classFilterOptions}
            selectedValues={selectedClasses}
            onSelectionChange={setSelectedClasses}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
            >
              <FilterX className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Controles de Modo de Visualização e Expansão */}
        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border">
          {viewMode === 'grouped' && groupedPositions.length > 0 && (
            <div className="flex items-center gap-1 mr-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAllGroups}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Expandir tudo
              </Button>
              <span className="text-muted-foreground/40">|</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAllGroups}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Retrair tudo
              </Button>
            </div>
          )}

          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
            <Button
              variant={viewMode === 'flat' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('flat')}
              className={`h-7 px-2.5 text-xs gap-1.5 ${
                viewMode === 'flat' ? 'shadow-xs font-semibold' : 'text-muted-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Tabela Única
            </Button>
            <Button
              variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grouped')}
              className={`h-7 px-2.5 text-xs gap-1.5 ${
                viewMode === 'grouped' ? 'shadow-xs font-semibold' : 'text-muted-foreground'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Agrupado por Classe
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando posições em custódia...</span>
        </div>
      ) : normalizedPositions.length === 0 ? (
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
      ) : filteredPositions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3 bg-card">
          <p className="text-sm font-medium text-foreground">
            Nenhuma posição atende aos filtros selecionados.
          </p>
          <p className="text-xs text-muted-foreground">
            Tente desmarcar ou alterar os filtros de ativo, conta ou classe.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
            Limpar todos os filtros
          </Button>
        </div>
      ) : viewMode === 'flat' ? (
        /* MODO 1: TABELA ÚNICA (SEM A COLUNA ORIGEM) */
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
                  <th className="px-4 py-3 text-right">Cotação Atual</th>
                  <th className="px-4 py-3 text-right">Valor de Mercado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPositions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span>{pos.ticker}</span>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {pos.assetName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{pos.accountName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{pos.assetClassLabel}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                      {formatQuantityE8(pos.quantityE8)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatCurrencyBRL(pos.averagePriceCents / 100)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatCurrencyBRL(pos.totalCostCents / 100)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      {pos.hasQuote && pos.currentPriceCents ? (
                        <span>{formatCurrencyBRL(pos.currentPriceCents / 100)}</span>
                      ) : pos.assetClass === 'fixed_income' ? (
                        <span className="text-muted-foreground text-[11px]">Renda Fixa</span>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] cursor-help">
                                Sem cotação
                                <Info className="h-3 w-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Ativo sem cotação recente na brapi.dev. Exibindo valor de custo.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                      {formatCurrencyBRL(pos.marketValueCents / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODO 2: AGRUPADO POR CLASSE DE ATIVO (TABELAS EXPANSÍVEIS/RETRÁTEIS, SEM COLUNA ORIGEM) */
        <div className="space-y-4">
          {groupedPositions.map((group) => {
            const isCollapsed = Boolean(collapsedClasses[group.classKey])

            return (
              <div
                key={group.classKey}
                className="rounded-lg border border-border bg-card overflow-hidden shadow-sm transition-all"
              >
                {/* Cabeçalho do Grupo Expansível / Retrátil */}
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(group.classKey)}
                  className="w-full flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 text-left transition-colors cursor-pointer border-b border-border/60"
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded bg-background border border-border text-foreground">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground">
                        {group.classLabel}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        ({group.items.length} {group.items.length === 1 ? 'ativo' : 'ativos'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">
                        Subtotal em Custo
                      </span>
                      <span className="text-sm font-bold font-mono text-foreground">
                        {formatCurrencyBRL(group.subtotalCostCents / 100)}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Conteúdo da Tabela da Classe */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/20 text-muted-foreground font-medium border-b border-border">
                        <tr>
                          <th className="px-4 py-2.5">Ticker / Ativo</th>
                          <th className="px-4 py-2.5">Conta de Custódia</th>
                          <th className="px-4 py-2.5 text-right">Quantidade (e8)</th>
                          <th className="px-4 py-2.5 text-right">Preço Médio</th>
                          <th className="px-4 py-2.5 text-right">Custo Total</th>
                          <th className="px-4 py-2.5 text-right">Cotação Atual</th>
                          <th className="px-4 py-2.5 text-right">Valor de Mercado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.items.map((pos) => (
                          <tr key={pos.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-mono font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                <Coins className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                  <span>{pos.ticker}</span>
                                  <span className="block text-[11px] font-normal text-muted-foreground">
                                    {pos.assetName}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{pos.accountName}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">
                              {formatQuantityE8(pos.quantityE8)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                              {formatCurrencyBRL(pos.averagePriceCents / 100)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                              {formatCurrencyBRL(pos.totalCostCents / 100)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-foreground">
                              {pos.hasQuote && pos.currentPriceCents ? (
                                <span>{formatCurrencyBRL(pos.currentPriceCents / 100)}</span>
                              ) : pos.assetClass === 'fixed_income' ? (
                                <span className="text-muted-foreground text-[11px]">
                                  Renda Fixa
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                                  Sem cotação
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                              {formatCurrencyBRL(pos.marketValueCents / 100)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t border-border font-medium text-muted-foreground">
                        <tr>
                          <td colSpan={4} className="px-4 py-2 text-right text-[11px]">
                            Subtotal {group.classLabel}:
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-semibold text-muted-foreground">
                            {formatCurrencyBRL(group.subtotalCostCents / 100)}
                          </td>
                          <td className="px-4 py-2 text-right text-[11px]">Mercado:</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-primary">
                            {formatCurrencyBRL(
                              group.items.reduce((acc, i) => acc + i.marketValueCents, 0) / 100,
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
