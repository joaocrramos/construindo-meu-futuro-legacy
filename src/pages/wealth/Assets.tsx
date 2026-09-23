import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Coins, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Ativos"
        description="Instrumentos negociáveis e patrimoniais: Renda Fixa (CDB, LCI/LCA, Tesouro), Ações, FIIs, Fundos, Criptoativos e Imóveis."
        icon={Coins}
        breadcrumbs={[{ label: 'Patrimônio', href: '/wealth/portfolios' }, { label: 'Ativos' }]}
        actions={
          <Button size="sm" className="h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Novo Ativo
          </Button>
        }
      />

      <EmptyState
        icon={Coins}
        title="Nenhum ativo cadastrado no catálogo"
        description="O catálogo unifica tickers da B3, títulos públicos, fundos de investimento e outros bens antes de vincular a uma posição com quantidade e preço."
        nextStepGuide="Cadastre ativos por código/ticker (ex.: PETR4, HGLG11, Tesouro Selic 2029) para posterior lançamento de compras e posições."
        actionLabel="Adicionar Instrumento / Ativo"
      />
    </div>
  )
}
