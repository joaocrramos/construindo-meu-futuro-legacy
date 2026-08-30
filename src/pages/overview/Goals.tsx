import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Target, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function GoalsOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Progresso das Metas"
        description="Acompanhamento do valor acumulado em relação às metas financeiras de curto, médio e longo prazo."
        icon={Target}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Progresso das Metas' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/goals">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nova Meta Financeira
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={Target}
        title="Nenhuma meta financeira cadastrada"
        description="Definir metas com valores e prazos claros permite mensurar a velocidade de acúmulo de capital e independência financeira."
        nextStepGuide="Crie sua primeira meta (ex: Reserva de Emergência de R$ 50.000 ou Independência Financeira) e vincule suas carteiras."
        actionLabel="Criar Primeira Meta"
        actionHref="/wealth/goals"
      />
    </div>
  )
}
