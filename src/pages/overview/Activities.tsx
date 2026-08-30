import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { History, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Atividades Recentes"
        description="Linha do tempo cronológica de lançamentos, conciliações, alterações cadastrais e eventos do patrimônio."
        icon={History}
        breadcrumbs={[
          { label: 'Visão Geral', href: '/dashboard' },
          { label: 'Atividades Recentes' },
        ]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/movements">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nova Atividade
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={History}
        title="Nenhuma atividade registrada na linha do tempo"
        description="Todas as ações de criação, edição de posições, importações e transferências realizadas gerarão registros automáticos aqui."
        nextStepGuide="Inicie suas operações cadastrando uma instituição ou movimentação para começar o registro do histórico."
        actionLabel="Cadastrar Instituição Financeira"
        actionHref="/wealth/institutions"
      />
    </div>
  )
}
