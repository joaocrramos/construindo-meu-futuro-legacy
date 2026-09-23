import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Mail, Plus, KeyRound, Copy, Check, Loader2, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  listInvitations,
  createInvitation,
  revokeInvitation,
  type InvitationRecord,
  type CreateInviteResponse,
} from '@/services/invitations'
import { formatDateBRL } from '@/lib/formatters'
import { parseAppError } from '@/lib/errorHandler'

export default function AdminInvitesPage() {
  const [invites, setInvites] = React.useState<InvitationRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [openModal, setOpenModal] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'user' | 'admin'>('user')
  const [submitting, setSubmitting] = React.useState(false)

  // Modal para exibir link gerado
  const [generatedInvite, setGeneratedInvite] = React.useState<CreateInviteResponse | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Diálogo de confirmação de revogação
  const [revokeTarget, setRevokeTarget] = React.useState<InvitationRecord | null>(null)

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await listInvitations()
      setInvites(data)
    } catch (err) {
      const parsed = parseAppError(err)
      toast.error(parsed.message || parsed.title)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    try {
      const res = await createInvitation(email.trim(), role)
      setGeneratedInvite(res)
      setOpenModal(false)
      setEmail('')
      setRole('user')
      toast.success(`Convite gerado com sucesso para ${res.email}!`)
      loadData()
    } catch (err: unknown) {
      const parsed = parseAppError(err)
      toast.error((err as { response?: { message?: string } })?.response?.message || parsed.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = (token: string) => {
    const origin = window.location.origin
    const inviteUrl = `${origin}/register?token=${encodeURIComponent(token)}`
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    toast.success('Link copiado para a área de transferência!')
    setTimeout(() => setCopied(false), 3000)
  }

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return
    try {
      await revokeInvitation(revokeTarget.id)
      toast.success(`O convite para ${revokeTarget.email} foi revogado com sucesso.`)
      setRevokeTarget(null)
      loadData()
    } catch (err) {
      const parsed = parseAppError(err)
      toast.error(parsed.message || parsed.title)
    }
  }

  const renderStatusBadge = (status: InvitationRecord['status'], expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date() && status === 'pending'
    if (status === 'accepted') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
          Aceito
        </Badge>
      )
    }
    if (status === 'revoked') {
      return <Badge variant="destructive">Revogado</Badge>
    }
    if (status === 'expired' || isExpired) {
      return (
        <Badge variant="outline" className="text-muted-foreground border-border">
          Expirado
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">
        Pendente
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Convites (Invite-Only)"
        description="Emissão, revogação e monitoramento de tokens de convite exclusivos para cadastro na plataforma."
        icon={Mail}
        badge="Acesso Restrito"
        breadcrumbs={[{ label: 'Administração', href: '/admin/users' }, { label: 'Convites' }]}
        actions={
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Gerar Novo Convite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Emitir Convite de Acesso Exclusivo</DialogTitle>
                <DialogDescription className="text-xs">
                  Um token criptográfico único e nominal será gerado para o e-mail informado.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvite} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invEmail" className="text-xs font-semibold">
                    E-mail do Convidado
                  </Label>
                  <Input
                    id="invEmail"
                    type="email"
                    placeholder="convidado@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invRole" className="text-xs font-semibold">
                    Papel de Acesso
                  </Label>
                  <Select value={role} onValueChange={(value: 'user' | 'admin') => setRole(value)}>
                    <SelectTrigger
                      id="invRole"
                      aria-label="Papel de Acesso"
                      className="w-full h-10 text-xs bg-background text-foreground border-input focus:ring-2 focus:ring-ring"
                    >
                      <SelectValue placeholder="Selecione o papel de acesso" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                      <SelectItem value="user" className="text-xs">
                        Usuário Comum (user)
                      </SelectItem>
                      <SelectItem value="admin" className="text-xs">
                        Administrador (admin)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg bg-secondary/50 text-[11px] text-muted-foreground leading-relaxed">
                  O link de ativação terá validade de 7 dias e só poderá ser utilizado uma única vez
                  para conclusão do cadastro em /register.
                </div>
                <DialogFooter>
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
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      'Emitir Convite Seguro'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Modal com Link Gerado */}
      <Dialog
        open={Boolean(generatedInvite)}
        onOpenChange={(open) => !open && setGeneratedInvite(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convite Criado com Sucesso</DialogTitle>
            <DialogDescription className="text-xs">
              Envie o link abaixo para <strong>{generatedInvite?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Link de Cadastro</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    generatedInvite
                      ? `${window.location.origin}/register?token=${encodeURIComponent(generatedInvite.token)}`
                      : ''
                  }
                  className="font-mono text-xs select-all"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => generatedInvite && handleCopyLink(generatedInvite.token)}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Válido até:{' '}
              {generatedInvite ? formatDateBRL(new Date(generatedInvite.expires_at)) : ''}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedInvite(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de revogação */}
      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revogar Convite"
        description={`Tem certeza de que deseja revogar o convite emitido para "${revokeTarget?.email}"? O token se tornará inválido imediatamente e o destinatário não conseguirá mais se cadastrar.`}
        confirmText="Sim, revogar convite"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmRevoke}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando convites...</span>
        </div>
      ) : invites.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhum convite pendente ou ativo emitido"
          description="O controle de convites garante que apenas pessoas expressamente autorizadas consigam criar credenciais no sistema."
          nextStepGuide="Clique em 'Gerar Novo Convite' para criar o primeiro token de convite e autorizar um novo membro da família ou titular."
          actionLabel="Gerar Primeiro Convite"
          onAction={() => setOpenModal(true)}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Data de Envio</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-muted-foreground">
                        {inv.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.created ? formatDateBRL(new Date(inv.created)) : '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.expires_at ? formatDateBRL(new Date(inv.expires_at)) : '-'}
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(inv.status, inv.expires_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'pending' && new Date(inv.expires_at) >= new Date() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          onClick={() => setRevokeTarget(inv)}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Revogar
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">—</span>
                      )}
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
