import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Building2, Plus, Edit2, Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
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
  listInstitutions,
  createInstitution,
  updateInstitution,
  toggleInstitutionActive,
  type InstitutionRecord,
  type InstitutionType,
} from '@/services/institutions'

const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  bank: 'Banco Comercial',
  broker: 'Corretora de Valores',
  crypto_exchange: 'Exchange Cripto',
  international: 'Conta Internacional',
  other: 'Outro',
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = React.useState<InstitutionRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal Create / Edit
  const [openModal, setOpenModal] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<InstitutionRecord | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Formulário
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [institutionType, setInstitutionType] = React.useState<InstitutionType>('bank')
  const [website, setWebsite] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  // Diálogo de alternância de status
  const [toggleTarget, setToggleTarget] = React.useState<InstitutionRecord | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await listInstitutions()
      setInstitutions(data)
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Falha ao buscar instituições.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setName('')
    setCode('')
    setInstitutionType('bank')
    setWebsite('')
    setIsActive(true)
    setOpenModal(true)
  }

  const handleOpenEdit = (item: InstitutionRecord) => {
    setEditingItem(item)
    setName(item.name)
    setCode(item.code || '')
    setInstitutionType(item.institution_type)
    setWebsite(item.website || '')
    setIsActive(item.is_active)
    setOpenModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Por favor, informe o nome da instituição.')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        await updateInstitution(editingItem.id, {
          name: name.trim(),
          code: code.trim() || undefined,
          institution_type: institutionType,
          website: website.trim() || undefined,
          is_active: isActive,
        })
        toast.success('Instituição atualizada com sucesso!')
      } else {
        await createInstitution({
          name: name.trim(),
          code: code.trim() || undefined,
          institution_type: institutionType,
          website: website.trim() || undefined,
          is_active: isActive,
        })
        toast.success('Instituição criada com sucesso!')
      }
      setOpenModal(false)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Não foi possível salvar a instituição.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return
    try {
      await toggleInstitutionActive(toggleTarget.id, toggleTarget.is_active)
      toast.success(
        `A instituição "${toggleTarget.name}" foi ${toggleTarget.is_active ? 'desativada' : 'ativada'} com sucesso.`,
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
        title="Instituições Financeiras"
        description="Bancos, corretoras de valores, custodiantes locais e internacionais onde seus recursos estão alocados."
        icon={Building2}
        breadcrumbs={[
          { label: 'Patrimônio', href: '/wealth/portfolios' },
          { label: 'Instituições' },
        ]}
        actions={
          <Button size="sm" className="h-9 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Instituição
          </Button>
        }
      />

      {/* Modal de Criação / Edição */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Instituição' : 'Nova Instituição'}</DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre o banco ou corretora onde você possui relacionamento financeiro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="instName" className="text-xs font-semibold">
                Nome da Instituição *
              </Label>
              <Input
                id="instName"
                placeholder="Ex.: Itaú Unibanco, XP Investimentos, BTG Pactual"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="instType" className="text-xs font-semibold">
                  Tipo de Instituição *
                </Label>
                <Select
                  value={institutionType}
                  onValueChange={(val: InstitutionType) => setInstitutionType(val)}
                >
                  <SelectTrigger
                    id="instType"
                    aria-label="Tipo de Instituição"
                    className="w-full h-9 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground border-border">
                    <SelectItem value="bank" className="text-xs">
                      Banco Comercial
                    </SelectItem>
                    <SelectItem value="broker" className="text-xs">
                      Corretora de Valores
                    </SelectItem>
                    <SelectItem value="crypto_exchange" className="text-xs">
                      Exchange Cripto
                    </SelectItem>
                    <SelectItem value="international" className="text-xs">
                      Internacional
                    </SelectItem>
                    <SelectItem value="other" className="text-xs">
                      Outro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instCode" className="text-xs font-semibold">
                  Código (COMPE / ISPB)
                </Label>
                <Input
                  id="instCode"
                  placeholder="Ex.: 341, 102"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instWebsite" className="text-xs font-semibold">
                Website Oficial
              </Label>
              <Input
                id="instWebsite"
                type="url"
                placeholder="https://www.itau.com.br"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="instActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label
                htmlFor="instActive"
                className="text-xs font-normal cursor-pointer select-none"
              >
                Instituição ativa para novas operações
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
                  'Criar Instituição'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de Ativar / Desativar */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Desativar Instituição' : 'Ativar Instituição'}
        description={
          toggleTarget?.is_active
            ? `Deseja desativar a instituição "${toggleTarget?.name}"? Suas contas vinculadas serão preservadas, mas novas operações ficarão suspensas.`
            : `Deseja reativar a instituição "${toggleTarget?.name}"?`
        }
        confirmText={toggleTarget?.is_active ? 'Sim, desativar' : 'Sim, ativar'}
        cancelText="Cancelar"
        isDestructive={toggleTarget?.is_active}
        onConfirm={handleConfirmToggle}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando instituições...</span>
        </div>
      ) : institutions.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma instituição cadastrada"
          description="Cadastre as entidades onde você mantém contas e custódias (ex.: Itaú, XP Investimentos, BTG Pactual, Nubank, Avenue)."
          nextStepGuide="Após cadastrar a instituição, você poderá vincular contas correntes, contas de investimento e produtos a ela."
          actionLabel="Criar primeira instituição"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Instituição</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {institutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{inst.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {inst.code || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {INSTITUTION_TYPE_LABELS[inst.institution_type] || inst.institution_type}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inst.website ? (
                        <a
                          href={inst.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          <span className="truncate max-w-[140px]">
                            {inst.website.replace(/^https?:\/\//, '')}
                          </span>
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inst.is_active ? (
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
                          onClick={() => handleOpenEdit(inst)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-xs ${
                            inst.is_active
                              ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10'
                          }`}
                          onClick={() => setToggleTarget(inst)}
                        >
                          {inst.is_active ? 'Desativar' : 'Ativar'}
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
