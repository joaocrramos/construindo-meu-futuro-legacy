import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ShieldCheck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Papéis & Permissões"
        description="Matriz RBAC (Role-Based Access Control) de privilégios entre Administradores e Titulares de Patrimônio."
        icon={ShieldCheck}
        badge="Administração"
        breadcrumbs={[
          { label: 'Administração', href: '/admin/users' },
          { label: 'Papéis & Permissões' },
        ]}
        actions={
          <Button size="sm" variant="outline" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Criar Papel Customizado
          </Button>
        }
      />

      <EmptyState
        icon={ShieldCheck}
        title="Matriz de permissões padrão em vigor"
        description="O sistema opera com 2 papéis nativos fundamentais: 'Administrador' (gestão de convites, auditoria e ambiente) e 'Titular / Usuário' (gestão isolada do próprio patrimônio)."
        nextStepGuide="A política padrão de segurança garante que usuários comuns não possam visualizar dados de outros titulares nem alterar seus próprios privilégios."
      />
    </div>
  )
}
