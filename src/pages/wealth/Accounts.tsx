import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { CreditCard, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas & Custódias"
        description="Contas correntes, contas de investimento, contas salário e contas no exterior vinculadas às instituições."
        icon={CreditCard}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Contas' }]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Conta
          </Button>
        }
      />

      <EmptyState
        icon={CreditCard}
        title="Nenhuma conta cadastrada"
        description="As contas representam os domicílios bancários e contas de custódia específicas dentro de cada instituição cadastrada."
        nextStepGuide="Cadastre sua primeira conta (ex: Conta Corrente Itaú ou Conta Investimentos XP) para abrigar saldo em dinheiro e ativos."
        actionLabel="Adicionar Conta"
      />
    </div>
  )
}
