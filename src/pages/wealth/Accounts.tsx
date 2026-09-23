import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CreditCard, Plus, Edit2, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
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
import { toast } from 'sonner'
import {
  listAccounts,
  createAccount,
  updateAccount,
  toggleAccountActive,
  type AccountRecord,
  type AccountType,
} from '@/services/accounts'
import { listInstitutions, type InstitutionRecord } from '@/services/institutions'

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  investment: 'Conta Investimento',
  savings: 'Conta Poupança',
  international_checking: 'Conta Internacional',
  cash: 'Caixa / Carteira Física',
  other: 'Outro',
}

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([])
  const [institutions, setInstitutions] = React.useState<InstitutionRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal Create / Edit
  const [openModal, setOpenModal] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<AccountRecord | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Formulário
  const [institutionId, setInstitutionId] = React.useState('')
  const [name, setName] = React.useState('')
  const [accountType, setAccountType] = React.useState<AccountType>('checking')
  const [currency, setCurrency] = React.useState('BRL')
  const [agency, setAgency] = React.useState('')
  const [accountNumber, setAccountNumber] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  // Alternância de status
  const [toggleTarget, setToggleTarget] = React.useState<AccountRecord | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [accData, instData] = await Promise.all([listAccounts(), listInstitutions()])
      setAccounts(accData)
      setInstitutions(instData)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Falha ao buscar dados de contas.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setInstitutionId(institutions[0]?.id || '')
    setName('')
    setAccountType('checking')
    setCurrency('BRL')
    setAgency('')
    setAccountNumber('')
    setIsActive(true)
    setOpenModal(true)
  }

  const handleOpenEdit = (item: AccountRecord) => {
    setEditingItem(item)
    setInstitutionId(item.institution_id)
    setName(item.name)
    setAccountType(item.account_type)
    setCurrency(item.currency || 'BRL')
    setAgency(item.agency || '')
    setAccountNumber(item.account_number || '')
    setIsActive(item.is_active)
    setOpenModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!institutionId) {
      toast.error('Selecione a instituição vinculada.')
      return
    }
    if (!name.trim()) {
      toast.error('Por favor, informe o nome da conta.')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        await updateAccount(editingItem.id, {
          institution_id: institutionId,
          name: name.trim(),
          account_type: accountType,
          currency: currency.trim().toUpperCase() || 'BRL',
          agency: agency.trim() || undefined,
          account_number: accountNumber.trim() || undefined,
          is_active: isActive,
        })
        toast.success('Conta atualizada com sucesso!')
      } else {
        await createAccount({
          institution_id: institutionId,
          name: name.trim(),
          account_type: accountType,
          currency: currency.trim().toUpperCase() || 'BRL',
          agency: agency.trim() || undefined,
          account_number: accountNumber.trim() || undefined,
          is_active: isActive,
        })
        toast.success('Conta criada com sucesso!')
      }
      setOpenModal(false)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Não foi possível salvar a conta.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return
    try {
      await toggleAccountActive(toggleTarget.id, toggleTarget.is_active)
      toast.success(
        `A conta "${toggleTarget.name}" foi ${toggleTarget.is_active ? 'desativada' : 'ativada'} com sucesso.`,
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
        title="Contas & Custódias"
        description="Contas correntes, contas de investimento, contas salário e contas no exterior vinculadas às instituições."
        icon={CreditCard}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Contas' }]}
        actions={
          <Button size="sm" className="h-9 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Conta
          </Button>
        }
      />

      {/* Modal de Criação / Edição */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription className="text-xs">
              Vincule sua conta corrente, custódia de investimentos ou carteira a uma instituição
              cadastrada.
            </DialogDescription>
          </DialogHeader>

          {institutions.length === 0 ? (
            <div className="space-y-3 py-4 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                É necessário cadastrar ao menos uma instituição financeira antes de criar uma conta.
              </p>
              <Button asChild size="sm">
                <a href="/wealth/institutions">Cadastrar Instituição</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="accInstitution" className="text-xs font-semibold">
                  Instituição Financeira *
                </Label>
                <select
                  id="accInstitution"
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Selecione uma instituição</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} {!inst.is_active ? '(Inativa)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accName" className="text-xs font-semibold">
                  Nome Identificador da Conta *
                </Label>
                <Input
                  id="accName"
                  placeholder="Ex.: Itaú Conta Principal, XP Custódia Geral, Nomad USD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="accType" className="text-xs font-semibold">
                    Tipo de Conta *
                  </Label>
                  <select
                    id="accType"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="checking">Conta Corrente</option>
                    <option value="investment">Conta Investimento</option>
                    <option value="savings">Conta Poupança</option>
                    <option value="international_checking">Internacional</option>
                    <option value="cash">Caixa / Carteira Física</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accCurrency" className="text-xs font-semibold">
                    Moeda *
                  </Label>
                  <Input
                    id="accCurrency"
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
                  <Label htmlFor="accAgency" className="text-xs font-semibold">
                    Agência
                  </Label>
                  <Input
                    id="accAgency"
                    placeholder="Ex.: 1234"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accNumber" className="text-xs font-semibold">
                    Número da Conta
                  </Label>
                  <Input
                    id="accNumber"
                    placeholder="Ex.: 12345-6"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="accActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                />
                <Label htmlFor="accActive" className="text-xs font-normal cursor-pointer">
                  Conta ativa para movimentações financeiras
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
                    'Criar Conta'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de status */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Desativar Conta' : 'Ativar Conta'}
        description={
          toggleTarget?.is_active
            ? `Deseja desativar a conta "${toggleTarget?.name}"? O saldo e lançamentos históricos serão preservados, mas novos aportes serão bloqueados.`
            : `Deseja reativar a conta "${toggleTarget?.name}"?`
        }
        confirmText={toggleTarget?.is_active ? 'Sim, desativar' : 'Sim, ativar'}
        cancelText="Cancelar"
        isDestructive={toggleTarget?.is_active}
        onConfirm={handleConfirmToggle}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando contas...</span>
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma conta cadastrada"
          description="As contas representam os domicílios bancários e contas de custódia específicas dentro de cada instituição cadastrada."
          nextStepGuide="Cadastre sua primeira conta (ex.: Conta Corrente Itaú ou Conta Investimentos XP) para abrigar saldo em dinheiro e ativos."
          actionLabel="Criar primeira conta"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Conta / Nome</th>
                  <th className="px-4 py-3">Instituição</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Moeda</th>
                  <th className="px-4 py-3">Agência / Número</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{acc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {acc.expand?.institution_id?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[acc.account_type] || acc.account_type}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      {acc.currency || 'BRL'}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {acc.agency || acc.account_number
                        ? `${acc.agency ? `Ag: ${acc.agency} ` : ''}${acc.account_number ? `CC: ${acc.account_number}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {acc.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground border-border gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Inativa
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleOpenEdit(acc)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-xs ${
                            acc.is_active
                              ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                          }`}
                          onClick={() => setToggleTarget(acc)}
                        >
                          {acc.is_active ? 'Desativar' : 'Ativar'}
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
