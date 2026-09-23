import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { FolderTree, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PortfoliosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Carteiras & Agrupamentos"
        description="Agrupamentos patrimoniais estratégicos para separar objetivos (ex.: Reserva, Aposentadoria, PJ, Família)."
        icon={FolderTree}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Carteiras' }]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Carteira
          </Button>
        }
      />

      <EmptyState
        icon={FolderTree}
        title="Nenhuma carteira patrimonial cadastrada"
        description="As carteiras são a base de organização do seu patrimônio. Elas permitem segmentar seus investimentos de acordo com o propósito e o horizonte de tempo."
        nextStepGuide="Clique em 'Nova Carteira' para definir o nome (ex.: Reserva de Liquidez) e o objetivo principal do agrupamento."
        actionLabel="Cadastrar Nova Carteira"
      />
    </div>
  )
}
