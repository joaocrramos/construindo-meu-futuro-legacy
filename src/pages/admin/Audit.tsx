import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { FileText, Download, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilha de Auditoria & Segurança"
        description="Registro imutável de eventos de autenticação, geração de convites, alterações de privilégios e operações críticas."
        icon={FileText}
        badge="Auditoria"
        breadcrumbs={[{ label: 'Administração', href: '/admin/users' }, { label: 'Auditoria' }]}
        actions={
          <Button size="sm" variant="outline" className="h-9 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" />
            Exportar Trilha (CSV)
          </Button>
        }
      />

      <EmptyState
        icon={ShieldAlert}
        title="Nenhum log crítico de auditoria a exibir"
        description="Todos os acessos administrativos, falhas de autenticação, ativação de convites e modificações sensíveis são gravados com timestamp UTC e IP mascarado."
        nextStepGuide="Os registros são mantidos estritamente protegidos contra exclusão ou alteração manual por qualquer usuário."
      />
    </div>
  )
}
