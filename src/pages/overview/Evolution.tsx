import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { TrendingUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function EvolutionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Evolução do Patrimônio"
        description="Acompanhamento temporal da valorização, aportes mensais e histórico de rentabilidade."
        icon={TrendingUp}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Evolução do Patrimônio' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/movements">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              Lançar Movimentação
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={TrendingUp}
        title="Histórico de evolução temporal não disponível"
        description="A curva de evolução patrimonial é gerada a partir dos fechamentos mensais e das movimentações registradas ao longo do tempo."
        nextStepGuide="Registre seus primeiros aportes em 'Movimentações' para iniciar a série histórica de crescimento do seu capital."
        actionLabel="Cadastrar Primeira Movimentação"
        actionHref="/wealth/movements"
      />
    </div>
  )
}
