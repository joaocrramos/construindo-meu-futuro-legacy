import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { BarChart3, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ConsolidationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidação Patrimonial"
        description="Fechamentos mensais, cálculo de variação real vs. inflação (IPCA/CDI) e relatórios patrimoniais consolidados."
        icon={BarChart3}
        breadcrumbs={[
          { label: 'Patrimônio', href: '/wealth/portfolios' },
          { label: 'Consolidação' },
        ]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Calculator className="h-3.5 w-3.5 mr-1" />
            Executar Fechamento Mensal
          </Button>
        }
      />

      <EmptyState
        icon={BarChart3}
        title="Nenhum fechamento patrimonial consolidado"
        description="A consolidação gera 'fotografias' oficiais do patrimônio no final de cada mês para comparações de rentabilidade e declaração de bens."
        nextStepGuide="Após lançar suas posições e saldos iniciais, execute o primeiro fechamento do mês para criar o ponto de partida do histórico."
        actionLabel="Iniciar Fechamento"
      />
    </div>
  )
}
