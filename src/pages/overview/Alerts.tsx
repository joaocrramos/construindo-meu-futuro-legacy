import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Bell, CheckCircle2 } from 'lucide-react'

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Alertas"
        description="Notificações sobre rebalanceamento de carteira, vencimento de títulos e eventos relevantes."
        icon={Bell}
        breadcrumbs={[{ label: 'Visão Geral', href: '/dashboard' }, { label: 'Alertas' }]}
      />

      <EmptyState
        icon={CheckCircle2}
        title="Nenhum alerta pendente no momento"
        description="Seu portfólio não possui advertências de risco, desvios excessivos de alocação ou notificações urgentes pendentes de atenção."
        nextStepGuide="Quando ativos atingirem o prazo de vencimento ou a alocação de uma classe fugir da sua meta estabelecida, as instruções aparecerão aqui."
      />
    </div>
  )
}
