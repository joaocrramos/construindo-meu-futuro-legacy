import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ArrowUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MovementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentações Financeiras"
        description="Histórico de aportes, resgates, compras de ativos, vendas, amortizações e proventos (dividendos, JCP, rendimentos)."
        icon={ArrowUpDown}
        breadcrumbs={[
          { label: 'Patrimônio', href: '/wealth/portfolios' },
          { label: 'Movimentações' },
        ]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Movimentação
          </Button>
        }
      />

      <EmptyState
        icon={ArrowUpDown}
        title="Nenhuma movimentação lançada"
        description="O registro minucioso de transações permite recalcular o preço médio, alimentar o histórico de proventos recebidos e apurar o resultado de vendas."
        nextStepGuide="Clique em 'Nova Movimentação' para cadastrar aportes de capital ou compras de ativos realizadas."
        actionLabel="Registrar Movimentação"
      />
    </div>
  )
}
