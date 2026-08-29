import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Wallet, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function SummaryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumo Patrimonial"
        description="Totalizadores consolidados, liquidez imediata e divisão por titularidade."
        icon={Wallet}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Resumo Patrimonial' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/portfolios">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Posição
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={Wallet}
        title="Nenhum patrimônio consolidado para exibição"
        description="O resumo patrimonial agrega dados de contas, carteiras e ativos cadastrados. Atualmente não há valores computados para seu perfil."
        nextStepGuide="Cadastre suas contas e posições de custódia na área 'Patrimônio' para calcular seu saldo bruto e líquido automaticamente."
        actionLabel="Ir para Contas & Custódias"
        onAction={() => window.location.assign('/wealth/accounts')}
        secondaryActionLabel="Ver Carteiras"
        onSecondaryAction={() => window.location.assign('/wealth/portfolios')}
      />
    </div>
  )
}
