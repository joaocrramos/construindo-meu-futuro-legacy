import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { LineChart, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotações & Preços"
        description="Histórico de fechamento de cotações de mercado e marcação a mercado dos ativos da carteira."
        icon={LineChart}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Cotações' }]}
        actions={
          <Button size="sm" variant="outline" className="h-9 text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar Fechamentos
          </Button>
        }
      />

      <EmptyState
        icon={LineChart}
        title="Nenhuma cotação recente sincronizada"
        description="Esta tabela armazena os preços históricos de ativos para cálculo de marcação a mercado e rentabilidade de fechamento."
        nextStepGuide="As cotações são associadas automaticamente após o cadastramento dos ativos no catálogo."
        actionLabel="Ver Catálogo de Ativos"
        onAction={() => window.location.assign('/wealth/assets')}
      />
    </div>
  )
}
