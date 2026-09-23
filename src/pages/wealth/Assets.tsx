import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Coins, Plus, Edit2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  listAssets,
  createAsset,
  updateAsset,
  toggleAssetActive,
  ASSET_CLASS_LABELS,
  FIXED_INCOME_SUBTYPES,
  type AssetRecord,
  type AssetClass,
} from '@/services/assets'

export default function AssetsPage() {
  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal Create / Edit
  const [openModal, setOpenModal] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<AssetRecord | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Formulário
  const [ticker, setTicker] = React.useState('')
  const [name, setName] = React.useState('')
  const [assetClass, setAssetClass] = React.useState<AssetClass>('equities')
  const [subType, setSubType] = React.useState('')
  const [currency, setCurrency] = React.useState('BRL')
  const [cnpjIssuer, setCnpjIssuer] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [indexerRate, setIndexerRate] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  // Alternância de status
  const [toggleTarget, setToggleTarget] = React.useState<AssetRecord | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await listAssets()
      setAssets(data)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Falha ao buscar catálogo de ativos.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setTicker('')
    setName('')
    setAssetClass('equities')
    setSubType('')
    setCurrency('BRL')
    setCnpjIssuer('')
    setDueDate('')
    setIndexerRate('')
    setIsActive(true)
    setOpenModal(true)
  }

  const handleOpenEdit = (item: AssetRecord) => {
    setEditingItem(item)
    setTicker(item.ticker)
    setName(item.name)
    setAssetClass(item.asset_class)
    setSubType(item.sub_type || '')
    setCurrency(item.currency || 'BRL')
    setCnpjIssuer(item.cnpj_issuer || '')
    setDueDate(item.due_date ? item.due_date.substring(0, 10) : '')
    setIndexerRate(item.indexer_rate || '')
    setIsActive(item.is_active)
    setOpenModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker.trim()) {
      toast.error('Por favor, informe o ticker/código do ativo.')
      return
    }
    if (!name.trim()) {
      toast.error('Por favor, informe o nome ou descrição do ativo.')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        await updateAsset(editingItem.id, {
          ticker: ticker.trim().toUpperCase(),
          name: name.trim(),
          asset_class: assetClass,
          sub_type: subType.trim() || undefined,
          currency: currency.trim().toUpperCase() || 'BRL',
          cnpj_issuer: cnpjIssuer.trim() || undefined,
          due_date: assetClass === 'fixed_income' && dueDate ? dueDate : undefined,
          indexer_rate:
            assetClass === 'fixed_income' && indexerRate.trim() ? indexerRate.trim() : undefined,
          is_active: isActive,
        })
        toast.success('Ativo atualizado com sucesso!')
      } else {
        await createAsset({
          ticker: ticker.trim().toUpperCase(),
          name: name.trim(),
          asset_class: assetClass,
          sub_type: subType.trim() || undefined,
          currency: currency.trim().toUpperCase() || 'BRL',
          cnpj_issuer: cnpjIssuer.trim() || undefined,
          due_date: assetClass === 'fixed_income' && dueDate ? dueDate : undefined,
          indexer_rate:
            assetClass === 'fixed_income' && indexerRate.trim() ? indexerRate.trim() : undefined,
          is_active: isActive,
        })
        toast.success('Ativo criado com sucesso!')
      }
      setOpenModal(false)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Não foi possível salvar o ativo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return
    try {
      await toggleAssetActive(toggleTarget.id, toggleTarget.is_active)
      toast.success(
        `O ativo "${toggleTarget.ticker}" foi ${toggleTarget.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      )
      setToggleTarget(null)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Não foi possível atualizar o status.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Ativos"
        description="Instrumentos negociáveis e patrimoniais: Renda Fixa (CDB, LCI/LCA, Tesouro), Ações, FIIs, Fundos, Criptoativos e Bens."
        icon={Coins}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Ativos' }]}
        actions={
          <Button size="sm" className="h-9 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Novo Ativo
          </Button>
        }
      />

      {/* Modal de Criação / Edição */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Ativo' : 'Novo Ativo'}</DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre instrumentos financeiros para negociar ou consolidar em sua custódia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="assetTicker" className="text-xs font-semibold">
                  {assetClass === 'fixed_income' ? 'Código / Sigla *' : 'Ticker / Código *'}
                </Label>
                <Input
                  id="assetTicker"
                  placeholder={
                    assetClass === 'fixed_income'
                      ? 'CDB-ITAU-2028'
                      : assetClass === 'crypto'
                        ? 'BTC'
                        : 'PETR4'
                  }
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="h-9 text-xs uppercase font-mono font-semibold"
                  required
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="assetName" className="text-xs font-semibold">
                  Nome do Ativo *
                </Label>
                <Input
                  id="assetName"
                  placeholder={
                    assetClass === 'fixed_income'
                      ? 'Ex.: CDB Banco Itaú 120% CDI, Tesouro IPCA+ 2029'
                      : 'Ex.: Petrobras PN, Tesouro Selic 2029'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assetClass" className="text-xs font-semibold">
                  Classe de Ativo *
                </Label>
                <Select value={assetClass} onValueChange={(val: AssetClass) => setAssetClass(val)}>
                  <SelectTrigger
                    id="assetClass"
                    aria-label="Classe de Ativo"
                    className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                  >
                    <SelectValue placeholder="Selecione a classe" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground border-border">
                    <SelectItem value="equities" className="text-xs">
                      Ações / Ações Globais
                    </SelectItem>
                    <SelectItem value="real_estate_funds" className="text-xs">
                      Fundos Imobiliários (FII)
                    </SelectItem>
                    <SelectItem value="fixed_income" className="text-xs">
                      Renda Fixa
                    </SelectItem>
                    <SelectItem value="mutual_funds" className="text-xs">
                      Fundos de Investimento
                    </SelectItem>
                    <SelectItem value="crypto" className="text-xs">
                      Criptoativos
                    </SelectItem>
                    <SelectItem value="cash_equivalent" className="text-xs">
                      Equivalente de Caixa
                    </SelectItem>
                    <SelectItem value="other" className="text-xs">
                      Outro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assetCurrency" className="text-xs font-semibold">
                  Moeda *
                </Label>
                <Input
                  id="assetCurrency"
                  placeholder="BRL, USD, EUR"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="h-9 text-xs uppercase font-mono"
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assetSubType" className="text-xs font-semibold">
                  {assetClass === 'fixed_income'
                    ? 'Tipo de Título / Produto'
                    : 'Subtipo / Segmento'}
                </Label>
                {assetClass === 'fixed_income' ? (
                  <Select value={subType} onValueChange={(val) => setSubType(val)}>
                    <SelectTrigger
                      id="assetSubType"
                      aria-label="Tipo de Título de Renda Fixa"
                      className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                    >
                      <SelectValue placeholder="Selecione (CDB, LCI, Tesouro...)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border max-h-56">
                      {FIXED_INCOME_SUBTYPES.map((st) => (
                        <SelectItem key={st} value={st} className="text-xs">
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="assetSubType"
                    placeholder="Ex.: Papel, Logística, Pré-fixado"
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="h-9 text-xs"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assetCnpj" className="text-xs font-semibold">
                  CNPJ Emissor / Administrador
                </Label>
                <Input
                  id="assetCnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpjIssuer}
                  onChange={(e) => setCnpjIssuer(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {assetClass === 'fixed_income' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-md border border-border">
                <div className="space-y-1.5">
                  <Label htmlFor="assetDueDate" className="text-xs font-semibold">
                    Data de Vencimento
                  </Label>
                  <Input
                    id="assetDueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assetIndexerRate" className="text-xs font-semibold">
                    Indexador / Taxa
                  </Label>
                  <Input
                    id="assetIndexerRate"
                    placeholder="Ex.: 120% do CDI, IPCA + 6,5%"
                    value={indexerRate}
                    onChange={(e) => setIndexerRate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="assetActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label
                htmlFor="assetActive"
                className="text-xs font-normal cursor-pointer select-none"
              >
                Ativo disponível para novas movimentações
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : editingItem ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Ativo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de status */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Desativar Ativo' : 'Ativar Ativo'}
        description={
          toggleTarget?.is_active
            ? `Deseja desativar o ativo "${toggleTarget?.ticker}"? O histórico de ordens passadas será preservado, mas ele não aparecerá em novos lançamentos.`
            : `Deseja reativar o ativo "${toggleTarget?.ticker}"?`
        }
        confirmText={toggleTarget?.is_active ? 'Sim, desativar' : 'Sim, ativar'}
        cancelText="Cancelar"
        isDestructive={toggleTarget?.is_active}
        onConfirm={handleConfirmToggle}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando ativos...</span>
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="Nenhum ativo cadastrado no catálogo"
          description="O catálogo unifica tickers da B3, títulos públicos, fundos de investimento e outros bens antes de vincular a uma posição com quantidade e preço."
          nextStepGuide="Cadastre ativos por código/ticker (ex.: PETR4, HGLG11, Tesouro Selic 2029) para posterior lançamento de compras e posições."
          actionLabel="Criar primeiro ativo"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Ticker / Código</th>
                  <th className="px-4 py-3">Nome do Ativo</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Subtipo</th>
                  <th className="px-4 py-3">Moeda</th>
                  <th className="px-4 py-3">CNPJ Emissor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{asset.ticker}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{asset.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ASSET_CLASS_LABELS[asset.asset_class] || asset.asset_class}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{asset.sub_type || '—'}</td>
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      {asset.currency || 'BRL'}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {asset.cnpj_issuer || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {asset.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground border-border gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleOpenEdit(asset)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-xs ${
                            asset.is_active
                              ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                          }`}
                          onClick={() => setToggleTarget(asset)}
                        >
                          {asset.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
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
