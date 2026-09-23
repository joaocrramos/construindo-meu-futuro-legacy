import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { DatePicker } from '@/components/DatePicker'
import {
  ArrowUpDown,
  Plus,
  Edit2,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Coins,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrencyBRL, formatDateBRL } from '@/lib/formatters'
import {
  listMovements,
  createMovement,
  updateMovement,
  MOVEMENT_TYPE_LABELS,
  ASSET_REQUIRED_MOVEMENTS,
  decimalToE8,
  e8ToDecimal,
  formatQuantityE8,
  brlToCents,
  centsToBrl,
  type MovementRecord,
  type MovementType,
} from '@/services/movements'
import { listAccounts, type AccountRecord } from '@/services/accounts'
import { listAssets, type AssetRecord } from '@/services/assets'

export default function MovementsPage() {
  const [movements, setMovements] = React.useState<MovementRecord[]>([])
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [assets, setAssets] = React.useState<AssetRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal Create / Edit
  const [openModal, setOpenModal] = React.useState(false)
  const [editingMovement, setEditingMovement] = React.useState<MovementRecord | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Formulário
  const [accountId, setAccountId] = React.useState('')
  const [assetId, setAssetId] = React.useState<string>('none')
  const [movementType, setMovementType] = React.useState<MovementType>('deposit')
  const [movementDate, setMovementDate] = React.useState<Date | undefined>(new Date())
  const [quantityInput, setQuantityInput] = React.useState('')
  const [unitPriceInput, setUnitPriceInput] = React.useState('')
  const [grossInput, setGrossInput] = React.useState('')
  // Para buy/sell: emolumentos e custos de liquidação somam em fees_cents
  const [emolumentsInput, setEmolumentsInput] = React.useState('0')
  const [settlementFeesInput, setSettlementFeesInput] = React.useState('0')
  // Para demais tipos (fee, etc.):
  const [feesInput, setFeesInput] = React.useState('0')
  // Para sell e outros tipos com imposto:
  const [taxesInput, setTaxesInput] = React.useState('0')
  // Campos de Renda Fixa: Data de Vencimento e Indexador/Taxa
  const [dueDateInput, setDueDateInput] = React.useState('')
  const [indexerRateInput, setIndexerRateInput] = React.useState('')
  const [idempotencyKey, setIdempotencyKey] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const isAssetRequired = ASSET_REQUIRED_MOVEMENTS.includes(movementType)

  // Ativo atualmente selecionado (se houver)
  const selectedAsset = React.useMemo(() => {
    if (!assetId || assetId === 'none') return null
    return assets.find((a) => a.id === assetId) || null
  }, [assetId, assets])

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
      toast.error((err as Error)?.message || 'Falha ao buscar movimentações financeiras.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenCreate = () => {
    setEditingMovement(null)
    const activeAcc = accounts.find((a) => a.is_active) || accounts[0]
    setAccountId(activeAcc?.id || '')
    const activeAsset = assets.find((a) => a.is_active) || assets[0]
    setAssetId(activeAsset?.id || 'none')
    setMovementType('buy')
    setMovementDate(new Date())
    setQuantityInput('')
    setUnitPriceInput('')
    setGrossInput('')
    setEmolumentsInput('0')
    setSettlementFeesInput('0')
    setFeesInput('0')
    setTaxesInput('0')
    setDueDateInput(activeAsset?.due_date ? activeAsset.due_date.substring(0, 10) : '')
    setIndexerRateInput(activeAsset?.indexer_rate || '')
    setFixedIncomeIssuer(activeAsset?.issuer || '')
    setFixedIncomeTitleType(activeAsset?.sub_type || 'CDB')
    setFixedIncomeForma('pos')
    setFixedIncomeIndexador('CDI')
    setFixedIncomeTaxa('')
    setFixedIncomeDailyLiquidity(false)
    setOtherAnnualInterest('')
    setIdempotencyKey('')
    setNotes('')
    setOpenModal(true)
  }

  // Campos específicos de Renda Fixa
  const [fixedIncomeIssuer, setFixedIncomeIssuer] = React.useState('')
  const [fixedIncomeTitleType, setFixedIncomeTitleType] = React.useState('CDB')
  const [fixedIncomeForma, setFixedIncomeForma] = React.useState<'pos' | 'pre'>('pos')
  const [fixedIncomeIndexador, setFixedIncomeIndexador] = React.useState('CDI')
  const [fixedIncomeTaxa, setFixedIncomeTaxa] = React.useState('')
  const [fixedIncomeDailyLiquidity, setFixedIncomeDailyLiquidity] = React.useState(false)

  // Campo específico para categoria OUTROS: Juros Anual
  const [otherAnnualInterest, setOtherAnnualInterest] = React.useState('')

  // Sincroniza campos padrão de renda fixa quando o usuário seleciona um ativo com due_date ou indexer_rate
  const handleAssetSelect = (newAssetId: string) => {
    setAssetId(newAssetId)
    if (newAssetId && newAssetId !== 'none') {
      const ast = assets.find((a) => a.id === newAssetId)
      if (ast) {
        if (ast.due_date && !dueDateInput) {
          setDueDateInput(ast.due_date.substring(0, 10))
        }
        if (ast.indexer_rate && !indexerRateInput) {
          setIndexerRateInput(ast.indexer_rate)
          // Se for renda fixa e o indexer_rate tiver formato conhecido, preencher forma/indexador/taxa
          if (ast.asset_class === 'fixed_income') {
            const rawRate = ast.indexer_rate
            if (
              rawRate.toLowerCase().includes('prefixado') ||
              rawRate.toLowerCase().includes('pré-fixado')
            ) {
              setFixedIncomeForma('pre')
              const match = rawRate.match(/[\d.,]+/)
              if (match) setFixedIncomeTaxa(match[0])
            } else if (rawRate.includes('IPCA')) {
              setFixedIncomeForma('pos')
              setFixedIncomeIndexador('IPCA+')
              const match = rawRate.match(/[\d.,]+/)
              if (match) setFixedIncomeTaxa(match[0])
            } else if (rawRate.includes('CDI+')) {
              setFixedIncomeForma('pos')
              setFixedIncomeIndexador('CDI+')
              const match = rawRate.match(/[\d.,]+/)
              if (match) setFixedIncomeTaxa(match[0])
            } else if (rawRate.includes('CDI')) {
              setFixedIncomeForma('pos')
              setFixedIncomeIndexador('CDI')
              const match = rawRate.match(/[\d.,]+/)
              if (match) setFixedIncomeTaxa(match[0])
            }
          }
        }
        if (ast.asset_class === 'fixed_income') {
          if (ast.sub_type) {
            setFixedIncomeTitleType(ast.sub_type)
          }
          if (ast.issuer) {
            setFixedIncomeIssuer(ast.issuer)
          }
        }
      }
    }
  }

  const handleOpenEdit = (mov: MovementRecord) => {
    if (mov.is_reversed) {
      toast.error('Movimentações estornadas não podem ser editadas.')
      return
    }

    setEditingMovement(mov)
    setAccountId(mov.account_id)
    setAssetId(mov.asset_id || 'none')
    setMovementType(mov.movement_type)

    if (mov.date) {
      // Evitar distorção de fuso horário criando a partir de ano, mês, dia
      const parts = mov.date.split('T')[0].split('-')
      if (parts.length === 3) {
        setMovementDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
      } else {
        setMovementDate(new Date(mov.date))
      }
    } else {
      setMovementDate(new Date())
    }

    const qtyDec = mov.quantity_e8 ? e8ToDecimal(mov.quantity_e8) : 0
    setQuantityInput(qtyDec > 0 ? String(qtyDec).replace('.', ',') : '')

    const unitPrice = mov.unit_price_cents ? centsToBrl(mov.unit_price_cents) : 0
    setUnitPriceInput(unitPrice > 0 ? unitPrice.toFixed(2).replace('.', ',') : '')

    const grossBrl = centsToBrl(mov.gross_amount_cents)
    setGrossInput(grossBrl > 0 ? grossBrl.toFixed(2).replace('.', ',') : '')

    const isBuyOrSellType = mov.movement_type === 'buy' || mov.movement_type === 'sell'
    const totalFeesBrl = centsToBrl(mov.fees_cents)
    if (isBuyOrSellType) {
      // Como não temos detalhamento salvo separado de emolumentos vs liquidação,
      // alocamos o total em emolumentos e 0 em liquidação na edição
      setEmolumentsInput(totalFeesBrl > 0 ? totalFeesBrl.toFixed(2).replace('.', ',') : '0')
      setSettlementFeesInput('0')
    } else {
      setFeesInput(totalFeesBrl > 0 ? totalFeesBrl.toFixed(2).replace('.', ',') : '0')
    }

    const taxesBrl = centsToBrl(mov.taxes_cents)
    setTaxesInput(taxesBrl > 0 ? taxesBrl.toFixed(2).replace('.', ',') : '0')

    setDueDateInput(mov.due_date ? mov.due_date.substring(0, 10) : '')
    setIndexerRateInput(mov.indexer_rate || '')

    const linkedAsset = assets.find((a) => a.id === mov.asset_id)
    setFixedIncomeIssuer(linkedAsset?.issuer || '')
    setFixedIncomeTitleType(linkedAsset?.sub_type || 'CDB')
    setFixedIncomeDailyLiquidity(false)

    // Se houver indexer_rate no mov ou asset, analisar para preencher campos auxiliares
    const currentRate = mov.indexer_rate || linkedAsset?.indexer_rate || ''
    if (linkedAsset?.asset_class === 'fixed_income' && currentRate) {
      if (
        currentRate.toLowerCase().includes('prefixado') ||
        currentRate.toLowerCase().includes('pré-fixado')
      ) {
        setFixedIncomeForma('pre')
        const m = currentRate.match(/[\d.,]+/)
        setFixedIncomeTaxa(m ? m[0] : '')
      } else if (currentRate.includes('IPCA')) {
        setFixedIncomeForma('pos')
        setFixedIncomeIndexador('IPCA+')
        const m = currentRate.match(/[\d.,]+/)
        setFixedIncomeTaxa(m ? m[0] : '')
      } else if (currentRate.includes('CDI+')) {
        setFixedIncomeForma('pos')
        setFixedIncomeIndexador('CDI+')
        const m = currentRate.match(/[\d.,]+/)
        setFixedIncomeTaxa(m ? m[0] : '')
      } else if (currentRate.includes('CDI')) {
        setFixedIncomeForma('pos')
        setFixedIncomeIndexador('CDI')
        const m = currentRate.match(/[\d.,]+/)
        setFixedIncomeTaxa(m ? m[0] : '')
      } else {
        setFixedIncomeTaxa(currentRate)
      }
    } else if (linkedAsset?.asset_class === 'other' && currentRate) {
      setOtherAnnualInterest(currentRate)
    } else {
      setFixedIncomeForma('pos')
      setFixedIncomeIndexador('CDI')
      setFixedIncomeTaxa('')
      setOtherAnnualInterest('')
    }

    setIdempotencyKey(mov.idempotency_key || '')
    setNotes(mov.notes || '')
    setOpenModal(true)
  }

  // Auto-cálculo de valor bruto ao alterar quantidade ou preço unitário em operações com ativo
  const handleQuantityOrPriceChange = (newQty: string, newPrice: string) => {
    setQuantityInput(newQty)
    setUnitPriceInput(newPrice)

    const q = Number.parseFloat(newQty.replace(',', '.'))
    const p = Number.parseFloat(newPrice.replace(',', '.'))
    if (!Number.isNaN(q) && !Number.isNaN(p) && q > 0 && p > 0) {
      const gross = (q * p).toFixed(2).replace('.', ',')
      setGrossInput(gross)
    }
  }

  // Cálculo de taxas (fees) e impostos (taxes) conforme o tipo de operação
  const isBuyOrSell = movementType === 'buy' || movementType === 'sell'
  const isBuy = movementType === 'buy'
  const isSell = movementType === 'sell'
  const isDepositOrWithdrawal = movementType === 'deposit' || movementType === 'withdrawal'

  // Para buy e sell: emolumentos + liquidação vão para fees_cents
  const computedFeesCents = React.useMemo(() => {
    if (isDepositOrWithdrawal) {
      return 0
    }
    if (isBuyOrSell) {
      return brlToCents(emolumentsInput) + brlToCents(settlementFeesInput)
    }
    return brlToCents(feesInput)
  }, [isDepositOrWithdrawal, isBuyOrSell, emolumentsInput, settlementFeesInput, feesInput])

  // Para buy, deposit e withdrawal: taxes_cents é sempre 0
  // Para sell e outros: taxes_cents vem do input
  const computedTaxesCents = React.useMemo(() => {
    if (isBuy || isDepositOrWithdrawal) {
      return 0
    }
    return brlToCents(taxesInput)
  }, [isBuy, isDepositOrWithdrawal, taxesInput])

  // Cálculo contábil:
  // - Na compra: valor líquido = bruto + emolumentos + liquidação (os custos entram no custo de aquisição)
  // - No depósito e resgate: valor líquido = bruto
  // - Na venda e demais: valor líquido = bruto - taxas/emolumentos - impostos/IR
  const calculatedNetCents = React.useMemo(() => {
    const gross = brlToCents(grossInput)
    if (isBuy) {
      return gross + computedFeesCents
    }
    if (isDepositOrWithdrawal) {
      return gross
    }
    return gross - computedFeesCents - computedTaxesCents
  }, [grossInput, isBuy, isDepositOrWithdrawal, computedFeesCents, computedTaxesCents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) {
      toast.error('Selecione a conta bancária ou de custódia.')
      return
    }
    if (isAssetRequired && (!assetId || assetId === 'none')) {
      toast.error('Esta operação exige que um ativo do catálogo seja selecionado.')
      return
    }
    if (!movementDate) {
      toast.error('Informe a data da movimentação.')
      return
    }

    const grossCents = brlToCents(grossInput)
    if (grossCents <= 0) {
      toast.error('O valor bruto da operação deve ser maior que zero.')
      return
    }

    const feesCents = computedFeesCents
    const taxesCents = computedTaxesCents

    // Em renda fixa (CDB, CRA, CRI, LCI, LCA), se a quantidade não for digitada, padroniza para 1 (escala e8)
    const isFixedIncome = selectedAsset?.asset_class === 'fixed_income'
    const resolvedQtyInput = isFixedIncome && !quantityInput.trim() ? '1' : quantityInput.trim()

    const qtyE8 = isAssetRequired || resolvedQtyInput ? decimalToE8(resolvedQtyInput) : undefined
    const unitCents =
      isFixedIncome && !unitPriceInput.trim() && grossCents > 0
        ? grossCents // Se for renda fixa com 1 título/aplicação, o preço unitário equivale ao valor aplicado
        : unitPriceInput.trim()
          ? brlToCents(unitPriceInput)
          : undefined

    // Se for renda fixa e o usuário preencheu forma/indexador/taxa, monta o indexer_rate textual se não houver um override manual
    let resolvedIndexerRate = indexerRateInput.trim()
    if (isFixedIncome) {
      if (fixedIncomeForma === 'pre' && fixedIncomeTaxa.trim()) {
        resolvedIndexerRate = `Pré-Fixado (${fixedIncomeTaxa.trim()}%)`
      } else if (fixedIncomeForma === 'pos' && (fixedIncomeTaxa.trim() || fixedIncomeIndexador)) {
        resolvedIndexerRate = fixedIncomeTaxa.trim()
          ? `${fixedIncomeIndexador} (${fixedIncomeTaxa.trim()}%)`
          : fixedIncomeIndexador
      }
    } else if (selectedAsset?.asset_class === 'other' && otherAnnualInterest.trim()) {
      resolvedIndexerRate = `Juros ${otherAnnualInterest.trim()}% a.a.`
    }

    setSubmitting(true)
    try {
      if (editingMovement) {
        await updateMovement(editingMovement.id, {
          account_id: accountId,
          asset_id: assetId && assetId !== 'none' ? assetId : null,
          movement_type: movementType,
          date: movementDate.toISOString().split('T')[0],
          quantity_e8: qtyE8,
          unit_price_cents: unitCents,
          gross_amount_cents: grossCents,
          fees_cents: feesCents,
          taxes_cents: taxesCents,
          net_amount_cents: calculatedNetCents,
          due_date: isFixedIncome && dueDateInput ? dueDateInput : null,
          indexer_rate: resolvedIndexerRate ? resolvedIndexerRate : null,
          notes: notes.trim() || null,
        })
        toast.success('Movimentação atualizada com sucesso!')
      } else {
        await createMovement({
          account_id: accountId,
          asset_id: assetId && assetId !== 'none' ? assetId : undefined,
          movement_type: movementType,
          date: movementDate.toISOString().split('T')[0],
          quantity_e8: qtyE8,
          unit_price_cents: unitCents,
          gross_amount_cents: grossCents,
          fees_cents: feesCents,
          taxes_cents: taxesCents,
          net_amount_cents: calculatedNetCents,
          due_date: isFixedIncome && dueDateInput ? dueDateInput : undefined,
          indexer_rate: resolvedIndexerRate ? resolvedIndexerRate : undefined,
          idempotency_key: idempotencyKey.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        toast.success('Movimentação registrada com sucesso!')
      }
      setOpenModal(false)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Não foi possível salvar a movimentação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentações Financeiras"
        description="Histórico de aportes, resgates, compras, vendas e proventos no livro-razão contábil."
        icon={ArrowUpDown}
        breadcrumbs={[
          { label: 'Patrimônio', href: '/wealth/portfolios' },
          { label: 'Movimentações' },
        ]}
        actions={
          <Button size="sm" className="h-9 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Movimentação
          </Button>
        }
      />

      {/* Modal de Criação / Edição */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMovement ? 'Editar Movimentação' : 'Nova Movimentação'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingMovement
                ? 'Atualize os dados da movimentação com recálculo automático de saldos e posições.'
                : 'Lance compras, vendas, aportes ou proventos com cálculo contábil imediato de taxas e líquido.'}
            </DialogDescription>
          </DialogHeader>

          {accounts.length === 0 ? (
            <div className="space-y-3 py-4 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                É necessário cadastrar ao menos uma conta antes de lançar movimentações.
              </p>
              <Button asChild size="sm">
                <a href="/wealth/accounts">Cadastrar Conta</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="movType" className="text-xs font-semibold">
                    Tipo de Operação *
                  </Label>
                  <Select
                    value={movementType}
                    onValueChange={(val: MovementType) => setMovementType(val)}
                  >
                    <SelectTrigger
                      id="movType"
                      aria-label="Tipo de Operação"
                      className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                    >
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border max-h-56">
                      <SelectItem value="buy" className="text-xs">
                        Compra de Ativo
                      </SelectItem>
                      <SelectItem value="sell" className="text-xs">
                        Venda de Ativo
                      </SelectItem>
                      <SelectItem value="dividend" className="text-xs">
                        Dividendo
                      </SelectItem>
                      <SelectItem value="interest_on_capital" className="text-xs">
                        Juros s/ Capital Próprio (JCP)
                      </SelectItem>
                      <SelectItem value="amortization" className="text-xs">
                        Amortização
                      </SelectItem>
                      <SelectItem value="deposit" className="text-xs">
                        Aporte / Depósito
                      </SelectItem>
                      <SelectItem value="withdrawal" className="text-xs">
                        Resgate / Saque
                      </SelectItem>
                      <SelectItem value="fee" className="text-xs">
                        Taxa / Corretagem
                      </SelectItem>
                      <SelectItem value="tax" className="text-xs">
                        Imposto
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="movDate" className="text-xs font-semibold">
                    Data da Operação *
                  </Label>
                  <DatePicker
                    id="movDate"
                    value={movementDate}
                    onChange={setMovementDate}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="movAccount" className="text-xs font-semibold">
                    Conta Vinculada *
                  </Label>
                  <Select value={accountId} onValueChange={(val) => setAccountId(val)}>
                    <SelectTrigger
                      id="movAccount"
                      aria-label="Conta Vinculada"
                      className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                    >
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.name} {!acc.is_active ? '(Inativa)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="movAsset" className="text-xs font-semibold">
                    Ativo {isAssetRequired ? '*' : '(Opcional)'}
                  </Label>
                  <Select value={assetId} onValueChange={handleAssetSelect}>
                    <SelectTrigger
                      id="movAsset"
                      aria-label="Ativo"
                      className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                    >
                      <SelectValue placeholder="Selecione o ativo" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      {!isAssetRequired && (
                        <SelectItem value="none" className="text-xs text-muted-foreground">
                          Nenhum (Lançamento em Dinheiro)
                        </SelectItem>
                      )}
                      {assets.map((ast) => (
                        <SelectItem key={ast.id} value={ast.id} className="text-xs font-mono">
                          {ast.ticker} — {ast.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Informação sobre Depósito / Saque */}
              {isDepositOrWithdrawal && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {movementType === 'deposit' ? 'Aporte em Dinheiro' : 'Resgate / Saque'}:
                  </span>{' '}
                  {movementType === 'deposit'
                    ? 'Este valor será creditado diretamente no saldo em caixa da conta selecionada.'
                    : 'Este valor será debitado do saldo em caixa da conta selecionada. A operação será rejeitada se o saldo for insuficiente.'}
                </div>
              )}

              {/* Campos adaptados conforme a classe do ativo */}
              {isAssetRequired && (
                <div className="space-y-2">
                  {selectedAsset?.asset_class === 'fixed_income' ? (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Renda Fixa — Detalhes do Título
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/30 text-primary"
                        >
                          {fixedIncomeTitleType || 'Renda Fixa'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="movFiIssuer" className="text-xs font-semibold">
                            Emissor
                          </Label>
                          <Input
                            id="movFiIssuer"
                            placeholder="Ex.: Banco Inter, Petrobras"
                            value={fixedIncomeIssuer}
                            onChange={(e) => setFixedIncomeIssuer(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="movFiTitleType" className="text-xs font-semibold">
                            Tipo de Título
                          </Label>
                          <Select
                            value={fixedIncomeTitleType}
                            onValueChange={(val) => setFixedIncomeTitleType(val)}
                          >
                            <SelectTrigger
                              id="movFiTitleType"
                              aria-label="Tipo de Título"
                              className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                            >
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover text-popover-foreground border-border max-h-56">
                              {[
                                'CDB',
                                'LCI',
                                'LCA',
                                'CRI',
                                'CRA',
                                'LC',
                                'LF',
                                'RDB',
                                'Debênture',
                                'CCB',
                              ].map((t) => (
                                <SelectItem key={t} value={t} className="text-xs">
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Forma: Pós-Fixado ou Pré-Fixado */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="movFiForma" className="text-xs font-semibold">
                            Forma
                          </Label>
                          <Select
                            value={fixedIncomeForma}
                            onValueChange={(val: 'pos' | 'pre') => setFixedIncomeForma(val)}
                          >
                            <SelectTrigger
                              id="movFiForma"
                              aria-label="Forma"
                              className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                            >
                              <SelectValue placeholder="Selecione a forma" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover text-popover-foreground border-border">
                              <SelectItem value="pos" className="text-xs">
                                Pós-Fixado
                              </SelectItem>
                              <SelectItem value="pre" className="text-xs">
                                Pré-Fixado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {fixedIncomeForma === 'pos' ? (
                          <div className="space-y-1.5">
                            <Label htmlFor="movFiIndexer" className="text-xs font-semibold">
                              Indexador
                            </Label>
                            <Select
                              value={fixedIncomeIndexador}
                              onValueChange={(val) => setFixedIncomeIndexador(val)}
                            >
                              <SelectTrigger
                                id="movFiIndexer"
                                aria-label="Indexador"
                                className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                              >
                                <SelectValue placeholder="Indexador" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover text-popover-foreground border-border">
                                <SelectItem value="CDI" className="text-xs">
                                  CDI
                                </SelectItem>
                                <SelectItem value="CDI+" className="text-xs">
                                  CDI+
                                </SelectItem>
                                <SelectItem value="IPCA+" className="text-xs">
                                  IPCA+
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        <div className="space-y-1.5">
                          <Label htmlFor="movFiTaxa" className="text-xs font-semibold">
                            {fixedIncomeForma === 'pre'
                              ? 'Taxa Pré-Fixada (%)'
                              : `Taxa do ${fixedIncomeIndexador} (%)`}
                          </Label>
                          <Input
                            id="movFiTaxa"
                            placeholder={
                              fixedIncomeForma === 'pre' ? 'Ex.: 12,5' : 'Ex.: 110 ou 6,5'
                            }
                            value={fixedIncomeTaxa}
                            onChange={(e) => setFixedIncomeTaxa(e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Valor e Datas */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="movGross" className="text-xs font-semibold">
                            {isBuy ? 'Valor (R$) *' : 'Valor do Resgate (R$) *'}
                          </Label>
                          <Input
                            id="movGross"
                            placeholder="Ex.: 5000,00"
                            value={grossInput}
                            onChange={(e) => setGrossInput(e.target.value)}
                            className="h-9 text-xs font-mono font-medium"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="movDueDate" className="text-xs font-semibold">
                            Data Vencimento
                          </Label>
                          <Input
                            id="movDueDate"
                            type="date"
                            value={dueDateInput}
                            onChange={(e) => setDueDateInput(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      {/* Checkbox Liquidez Diária */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          id="movDailyLiquidity"
                          type="checkbox"
                          checked={fixedIncomeDailyLiquidity}
                          onChange={(e) => setFixedIncomeDailyLiquidity(e.target.checked)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                        />
                        <Label
                          htmlFor="movDailyLiquidity"
                          className="text-xs cursor-pointer font-normal"
                        >
                          Liquidez Diária
                        </Label>
                      </div>
                    </div>
                  ) : selectedAsset?.asset_class === 'other' ? (
                    // OUTROS: Nome do Ativo, Quantidade, Preço, Juros Anual
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="movQty" className="text-xs font-semibold">
                            Quantidade
                          </Label>
                          <Input
                            id="movQty"
                            placeholder="Ex.: 10 ou 1"
                            value={quantityInput}
                            onChange={(e) =>
                              handleQuantityOrPriceChange(e.target.value, unitPriceInput)
                            }
                            className="h-9 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="movUnitPrice" className="text-xs font-semibold">
                            Preço
                          </Label>
                          <Input
                            id="movUnitPrice"
                            placeholder="Ex.: 150,00"
                            value={unitPriceInput}
                            onChange={(e) =>
                              handleQuantityOrPriceChange(quantityInput, e.target.value)
                            }
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="movOtherInterest" className="text-xs font-semibold">
                          Juros Anual (% a.a.)
                        </Label>
                        <Input
                          id="movOtherInterest"
                          placeholder="Ex.: 10,5"
                          value={otherAnnualInterest}
                          onChange={(e) => setOtherAnnualInterest(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    // Ações, FII, BDR, ETF, Cripto, Stocks, REITs, Tesouro Direto, Fundos
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="movQty" className="text-xs font-semibold">
                          Quantidade
                        </Label>
                        <Input
                          id="movQty"
                          placeholder="Ex.: 100 ou 0,05"
                          value={quantityInput}
                          onChange={(e) =>
                            handleQuantityOrPriceChange(e.target.value, unitPriceInput)
                          }
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="movUnitPrice" className="text-xs font-semibold">
                          Preço {selectedAsset?.asset_class === 'international' ? '(USD)' : '(R$)'}
                        </Label>
                        <Input
                          id="movUnitPrice"
                          placeholder="Ex.: 35,50"
                          value={unitPriceInput}
                          onChange={(e) =>
                            handleQuantityOrPriceChange(quantityInput, e.target.value)
                          }
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Valores Financeiros: Bruto, Emolumentos, Liquidação, Outros Custos, IR / Impostos e Totais */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                {isBuy ? (
                  // Compra de Ativo (SEM campo de IR)
                  selectedAsset?.asset_class === 'international' ||
                  selectedAsset?.asset_class === 'fund' ||
                  selectedAsset?.asset_class === 'other' ||
                  (selectedAsset?.asset_class === 'fixed_income' &&
                    (selectedAsset.sub_type?.includes('Tesouro') ||
                      selectedAsset.name?.toLowerCase().includes('tesouro'))) ? (
                    // Stocks/REITs (USD), Fundos, Outros, Tesouro Direto: Bruto + Outros Custos
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="movGross" className="text-xs font-semibold">
                          Valor Bruto{' '}
                          {selectedAsset?.asset_class === 'international' ? '(USD)' : '(R$)'} *
                        </Label>
                        <Input
                          id="movGross"
                          placeholder="0,00"
                          value={grossInput}
                          onChange={(e) => setGrossInput(e.target.value)}
                          className="h-8 text-xs font-mono font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movEmoluments" className="text-xs font-semibold">
                          Outros Custos{' '}
                          {selectedAsset?.asset_class === 'international' ? '(USD)' : '(R$)'}
                        </Label>
                        <Input
                          id="movEmoluments"
                          placeholder="0,00"
                          value={emolumentsInput}
                          onChange={(e) => setEmolumentsInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    // Ações, FII, BDR, ETF, Cripto, Renda Fixa tradicional: Bruto + Emolumentos + Liquidação
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="movGross" className="text-xs font-semibold">
                          Valor Bruto (R$) *
                        </Label>
                        <Input
                          id="movGross"
                          placeholder="0,00"
                          value={grossInput}
                          onChange={(e) => setGrossInput(e.target.value)}
                          className="h-8 text-xs font-mono font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movEmoluments" className="text-xs font-semibold">
                          Emolumentos (R$)
                        </Label>
                        <Input
                          id="movEmoluments"
                          placeholder="0,00"
                          value={emolumentsInput}
                          onChange={(e) => setEmolumentsInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movSettlement" className="text-xs font-semibold">
                          Liquidação (R$)
                        </Label>
                        <Input
                          id="movSettlement"
                          placeholder="0,00"
                          value={settlementFeesInput}
                          onChange={(e) => setSettlementFeesInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )
                ) : isSell ? (
                  // Venda de Ativo: com campo de IR
                  selectedAsset?.asset_class === 'international' ||
                  selectedAsset?.asset_class === 'fund' ||
                  selectedAsset?.asset_class === 'other' ||
                  (selectedAsset?.asset_class === 'fixed_income' &&
                    (selectedAsset.sub_type?.includes('Tesouro') ||
                      selectedAsset.name?.toLowerCase().includes('tesouro'))) ? (
                    // Stocks/REITs (USD), Fundos, Outros, Tesouro Direto: Bruto + Outros Custos + IR
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="movGross" className="text-xs font-semibold">
                          Valor Bruto{' '}
                          {selectedAsset?.asset_class === 'international' ? '(USD)' : '(R$)'} *
                        </Label>
                        <Input
                          id="movGross"
                          placeholder="0,00"
                          value={grossInput}
                          onChange={(e) => setGrossInput(e.target.value)}
                          className="h-8 text-xs font-mono font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movEmoluments" className="text-xs font-semibold">
                          Outros Custos{' '}
                          {selectedAsset?.asset_class === 'international' ? '(USD)' : '(R$)'}
                        </Label>
                        <Input
                          id="movEmoluments"
                          placeholder="0,00"
                          value={emolumentsInput}
                          onChange={(e) => setEmolumentsInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movTaxes" className="text-xs font-semibold">
                          IR {selectedAsset?.asset_class === 'international' ? '(USD)' : '(R$)'}
                        </Label>
                        <Input
                          id="movTaxes"
                          placeholder="0,00"
                          value={taxesInput}
                          onChange={(e) => setTaxesInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    // Ações, FII, BDR, ETF, Cripto: Bruto + Emolumentos + Liquidação + IR
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="movGross" className="text-xs font-semibold">
                          Valor Bruto (R$) *
                        </Label>
                        <Input
                          id="movGross"
                          placeholder="0,00"
                          value={grossInput}
                          onChange={(e) => setGrossInput(e.target.value)}
                          className="h-8 text-xs font-mono font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movEmoluments" className="text-xs font-semibold">
                          Emolumentos (R$)
                        </Label>
                        <Input
                          id="movEmoluments"
                          placeholder="0,00"
                          value={emolumentsInput}
                          onChange={(e) => setEmolumentsInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movSettlement" className="text-xs font-semibold">
                          Liquidação (R$)
                        </Label>
                        <Input
                          id="movSettlement"
                          placeholder="0,00"
                          value={settlementFeesInput}
                          onChange={(e) => setSettlementFeesInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="movTaxes" className="text-xs font-semibold">
                          IR (R$)
                        </Label>
                        <Input
                          id="movTaxes"
                          placeholder="0,00"
                          value={taxesInput}
                          onChange={(e) => setTaxesInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )
                ) : isDepositOrWithdrawal ? (
                  // Depósito ou Saque (Apenas valor em dinheiro em caixa)
                  <div className="space-y-1">
                    <Label htmlFor="movGross" className="text-xs font-semibold">
                      Valor {movementType === 'deposit' ? 'do Aporte' : 'do Resgate'} (R$) *
                    </Label>
                    <Input
                      id="movGross"
                      placeholder="0,00"
                      value={grossInput}
                      onChange={(e) => setGrossInput(e.target.value)}
                      className="h-8 text-xs font-mono font-medium"
                      required
                    />
                  </div>
                ) : (
                  // Demais tipos (dividend, fee, tax, etc.)
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="movGross" className="text-xs font-semibold">
                        Valor Bruto (R$) *
                      </Label>
                      <Input
                        id="movGross"
                        placeholder="0,00"
                        value={grossInput}
                        onChange={(e) => setGrossInput(e.target.value)}
                        className="h-8 text-xs font-mono font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="movFees" className="text-xs font-semibold">
                        Taxas / Corret. (R$)
                      </Label>
                      <Input
                        id="movFees"
                        placeholder="0,00"
                        value={feesInput}
                        onChange={(e) => setFeesInput(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="movTaxes" className="text-xs font-semibold">
                        Impostos / IR (R$)
                      </Label>
                      <Input
                        id="movTaxes"
                        placeholder="0,00"
                        value={taxesInput}
                        onChange={(e) => setTaxesInput(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Linha de Resumo Dinâmica */}
                <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                  {isBuy ? (
                    <>
                      <span className="text-muted-foreground font-medium">
                        Custo total da aquisição:
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrencyBRL(calculatedNetCents / 100)}
                      </span>
                    </>
                  ) : isSell ? (
                    <>
                      <span className="text-muted-foreground font-medium">
                        Valor líquido da venda:
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrencyBRL(calculatedNetCents / 100)}
                      </span>
                    </>
                  ) : isDepositOrWithdrawal ? (
                    <>
                      <span className="text-muted-foreground font-medium">
                        Impacto em caixa da conta:
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          movementType === 'deposit'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {movementType === 'deposit' ? '+' : '-'}
                        {formatCurrencyBRL(calculatedNetCents / 100)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground font-medium">
                        Valor Líquido Calculado:
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrencyBRL(calculatedNetCents / 100)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="movIdempotency" className="text-xs font-semibold">
                    Chave de Idempotência
                  </Label>
                  <Input
                    id="movIdempotency"
                    placeholder="Ex.: ORD-2026-0001 (opcional)"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    className="h-9 text-xs font-mono"
                    disabled={Boolean(editingMovement)}
                  />
                  {editingMovement && (
                    <span className="text-[10px] text-muted-foreground">
                      Chave original mantida pelo sistema na edição.
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="movNotes" className="text-xs font-semibold">
                    Observações / Nota de Corretagem
                  </Label>
                  <Input
                    id="movNotes"
                    placeholder="Ex.: Ordem B3 #9872"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
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
                      {editingMovement ? 'Salvando...' : 'Registrando...'}
                    </>
                  ) : editingMovement ? (
                    'Salvar Alterações'
                  ) : (
                    'Confirmar Lançamento'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando movimentações...</span>
        </div>
      ) : movements.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="Nenhuma movimentação lançada"
          description="O livro-razão registra cada aporte, retirada, provento ou negociação de ativo para composição de saldos e cálculo de rentabilidade."
          nextStepGuide="Lance sua primeira compra de ativo ou depósito na conta de custódia."
          actionLabel="Registrar primeira movimentação"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Ativo</th>
                  <th className="px-4 py-3">Conta</th>
                  <th className="px-4 py-3 text-right">Qtd (e8)</th>
                  <th className="px-4 py-3 text-right">Preço Unit.</th>
                  <th className="px-4 py-3 text-right">Valor Bruto</th>
                  <th className="px-4 py-3 text-right">Líquido</th>
                  <th className="px-4 py-3">Chave / Nota</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {movements.map((mov) => {
                  const isPositive =
                    mov.movement_type === 'deposit' ||
                    mov.movement_type === 'dividend' ||
                    mov.movement_type === 'interest_on_capital' ||
                    mov.movement_type === 'sell'
                  const isNegative =
                    mov.movement_type === 'withdrawal' ||
                    mov.movement_type === 'buy' ||
                    mov.movement_type === 'fee' ||
                    mov.movement_type === 'tax'

                  return (
                    <tr key={mov.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {formatDateBRL(mov.date)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`gap-1 font-medium ${
                            isPositive
                              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : isNegative
                                ? 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                                : 'border-border text-foreground'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : isNegative ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <DollarSign className="h-3 w-3" />
                          )}
                          {MOVEMENT_TYPE_LABELS[mov.movement_type] || mov.movement_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">
                        {mov.expand?.asset_id ? (
                          <div className="flex items-center gap-1.5">
                            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{mov.expand.asset_id.ticker}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-normal">Conta / Caixa</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {mov.expand?.account_id?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {mov.quantity_e8 ? formatQuantityE8(mov.quantity_e8) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {mov.unit_price_cents ? formatCurrencyBRL(mov.unit_price_cents / 100) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {formatCurrencyBRL(mov.gross_amount_cents / 100)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        {formatCurrencyBRL(mov.net_amount_cents / 100)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {mov.idempotency_key ? (
                          <span title={mov.notes}>{mov.idempotency_key}</span>
                        ) : mov.notes ? (
                          <span>{mov.notes}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!mov.is_reversed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleOpenEdit(mov)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
