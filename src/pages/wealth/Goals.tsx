import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Target, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function WealthGoalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas Patrimoniais"
        description="Planejamento de marcos de patrimônio líquido, metas de renda passiva mensal e objetivos de vida."
        icon={Target}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Metas' }]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Meta
          </Button>
        }
      />

      <EmptyState
        icon={Target}
        title="Nenhuma meta patrimonial configurada"
        description="As metas financeiras ajudam a manter a disciplina de investimento e mensuram o tempo estimado até a independência financeira."
        nextStepGuide="Crie sua meta especificando o valor alvo (ex.: R$ 1.000.000) e a data limite estimada."
        actionLabel="Configurar Primeira Meta"
      />
    </div>
  )
}
