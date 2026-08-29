import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Layers, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PositionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Posições em Custódia"
        description="Saldos atuais, quantidade de cotas/títulos, preço médio de aquisição, valor de mercado e resultado não realizado."
        icon={Layers}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Posições' }]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar Posição
          </Button>
        }
      />

      <EmptyState
        icon={Layers}
        title="Nenhuma posição em custódia encontrada"
        description="As posições são o cruzamento entre um Ativo, uma Conta custodiante e uma Carteira, com quantidade e preço de entrada."
        nextStepGuide="Lance uma posição informando a conta, o ativo, a quantidade detida e o custo total de aquisição."
        actionLabel="Lançar Posição"
      />
    </div>
  )
}
