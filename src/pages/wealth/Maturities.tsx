import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MaturitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vencimentos & Liquidez"
        description="Gestão de liquidez futura e datas de vencimento de contratos, títulos privados, debêntures e fundos fechados."
        icon={Calendar}
        breadcrumbs={[
          { label: 'Patrimônio', href: '/wealth/portfolios' },
          { label: 'Vencimentos' },
        ]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Programar Vencimento
          </Button>
        }
      />

      <EmptyState
        icon={Calendar}
        title="Sem vencimentos programados"
        description="Acompanhe de forma granular quando seus títulos de renda fixa vencerão e planeje o reinvestimento do principal e juros."
        nextStepGuide="Cadastre a data de vencimento nas posições de custódia para gerar o calendário automático de resgates."
        actionLabel="Adicionar Posição com Vencimento"
        actionHref="/wealth/positions"
      />
    </div>
  )
}
