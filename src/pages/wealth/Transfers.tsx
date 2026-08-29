import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TransfersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferências entre Contas"
        description="Controle de transferências internas (TED/PIX/Remessas internacionais) entre contas e instituições do mesmo titular."
        icon={ArrowLeftRight}
        breadcrumbs={[
          { label: 'Patrimônio', href: '/wealth/portfolios' },
          { label: 'Transferências' },
        ]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Transferência
          </Button>
        }
      />

      <EmptyState
        icon={ArrowLeftRight}
        title="Nenhuma transferência registrada"
        description="Transferências internas movimentam saldo de dinheiro entre contas de origem e destino sem afetar o patrimônio líquido total."
        nextStepGuide="Registre transferências para manter os saldos das suas contas correntes e corretoras devidamente conciliados."
        actionLabel="Lançar Transferência"
      />
    </div>
  )
}
