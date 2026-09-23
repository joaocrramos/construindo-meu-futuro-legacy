import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function InstitutionsPage() {
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
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Instituição
          </Button>
        }
      />

      <EmptyState
        icon={Building2}
        title="Nenhuma instituição cadastrada"
        description="Cadastre as entidades onde você mantém contas e custódias (ex.: Itaú, XP Investimentos, BTG Pactual, Nubank, Avenue)."
        nextStepGuide="Após cadastrar a instituição, você poderá vincular contas correntes, contas de investimento e produtos a ela."
        actionLabel="Adicionar Instituição"
      />
    </div>
  )
}
