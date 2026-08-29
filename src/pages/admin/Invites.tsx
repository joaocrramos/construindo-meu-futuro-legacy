import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Mail, Plus, KeyRound } from 'lucide-react'
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

export default function AdminInvitesPage() {
  const [openModal, setOpenModal] = React.useState(false)
  const [email, setEmail] = React.useState('')

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault()
    // Estrutura pronta para chamada de serviço backend
    setOpenModal(false)
    setEmail('')
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
                  Um token único e nominal será gerado para o e-mail informado.
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
                <div className="p-3 rounded-lg bg-secondary/50 text-[11px] text-muted-foreground leading-relaxed">
                  O link de ativação terá validade de 7 dias e só poderá ser utilizado uma única
                  vez.
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Emitir Convite Seguro</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <EmptyState
        icon={KeyRound}
        title="Nenhum convite pendente ou ativo emitido"
        description="O controle de convites garante que apenas pessoas expressamente autorizadas consigam criar credenciais no sistema."
        nextStepGuide="Clique em 'Gerar Novo Convite' para criar o primeiro token de convite e autorizar um novo membro da família ou titular."
        actionLabel="Gerar Primeiro Convite"
        onAction={() => setOpenModal(true)}
      />
    </div>
  )
}
