import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function DueDatesOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Próximos Vencimentos"
        description="Cronograma integrado de resgates, vencimentos de Renda Fixa, proventos e obrigações patrimoniais."
        icon={Calendar}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Próximos Vencimentos' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/maturities">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Gestão de Vencimentos
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={Calendar}
        title="Sem vencimentos agendados para os próximos meses"
        description="Nenhum título, contrato ou obrigação com data de liquidação futura foi identificado nos seus registros."
        nextStepGuide="Ao cadastrar títulos de renda fixa (CDBs, LCIs, Tesouro Direto) na aba de Posições, as datas de liquidação serão sincronizadas neste painel."
        actionLabel="Adicionar Ativo de Renda Fixa"
        onAction={() => window.location.assign('/wealth/positions')}
      />
    </div>
  )
}
