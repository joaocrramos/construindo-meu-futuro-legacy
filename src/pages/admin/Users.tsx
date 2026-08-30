import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Usuários"
        description="Controle de contas, papéis, status (ativo/suspenso), verificação de e-mail e políticas de acesso administrativo."
        icon={Users}
        badge="Administração"
        breadcrumbs={[{ label: 'Administração', href: '/admin/users' }, { label: 'Usuários' }]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/admin/invites">
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Emitir Novo Convite
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={Users}
        title="Nenhum usuário secundário cadastrado"
        description="A lista exibe todos os usuários que concluíram o processo de cadastro via convite e suas respectivas permissões."
        nextStepGuide="Como o sistema é exclusivamente Invite-Only, para adicionar novos membros, emita convites nominais na aba 'Convites'."
        actionLabel="Ir para Gestão de Convites"
        actionHref="/admin/invites"
      />
    </div>
  )
}
