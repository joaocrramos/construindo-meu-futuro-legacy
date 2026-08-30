import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { PieChart, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function DistributionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Distribuição por Categoria"
        description="Alocação percentual por classes de ativos (Renda Fixa, Ações, FIIs, Criptoativos, Imóveis e Caixa)."
        icon={PieChart}
        breadcrumbs={[{ label: 'Visão Geral', href: '/dashboard' }, { label: 'Distribuição' }]}
        actions={
          <Button asChild size="sm" className="h-9 text-xs">
            <Link to="/wealth/assets">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Cadastrar Ativo
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={PieChart}
        title="Nenhuma classe de ativos alocada"
        description="O gráfico de pizza e matriz de exposição exibem a proporção de cada categoria no total da sua carteira."
        nextStepGuide="Cadastre os ativos mantidos em custódia para visualizar o percentual atual de cada classe versus o percentual ideal planejado."
        actionLabel="Explorar Catálogo de Ativos"
        actionHref="/wealth/assets"
      />
    </div>
  )
}
