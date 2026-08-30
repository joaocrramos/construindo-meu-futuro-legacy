import * as React from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrencyBRL } from '@/lib/formatters'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PieChart,
  Calendar,
  AlertCircle,
  PlusCircle,
  ShieldCheck,
  FolderTree,
} from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Consolidado"
        description="Visão geral do seu patrimônio, métricas de alocação e alertas recentes."
        icon={LayoutDashboard}
        badge="Fundação MVP"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-9 text-xs font-semibold">
              <Link to="/wealth/portfolios">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Criar Primeira Carteira
              </Link>
            </Button>
          </div>
        }
      />

      {/* Metric KPI Cards (Estados com valores zerados/reais da fundação sem mock artificial) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Patrimônio Bruto
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {formatCurrencyBRL(0, { type: 'bruto' })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Nenhum ativo custodiado registrado
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Rentabilidade Acumulada
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">0,00%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Aguardando histórico de movimentações
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Classes de Ativos
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">0</div>
            <p className="text-[11px] text-muted-foreground mt-1">Nenhuma categoria vinculada</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Próximo Vencimento
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">—</div>
            <p className="text-[11px] text-muted-foreground mt-1">Sem compromissos no radar</p>
          </CardContent>
        </Card>
      </div>

      {/* Estado vazio principal com orientação de onboard da fundação */}
      <EmptyState
        icon={FolderTree}
        title="Seu patrimônio ainda não possui registros cadastrados"
        description="Esta é a fundação do Construindo Meu Futuro. Para começar a monitorar a evolução dos seus investimentos, comece estruturando suas carteiras e instituições financeiras."
        nextStepGuide="Acesse a seção 'Patrimônio > Carteiras' para cadastrar seu primeiro agrupamento estratégico (ex: Reserva de Emergência, Aposentadoria, Renda Passiva)."
        actionLabel="Cadastrar Primeira Carteira"
        actionHref="/wealth/portfolios"
        secondaryActionLabel="Ver Instituições"
        secondaryActionHref="/wealth/institutions"
      />

      {/* Grid com seções informativas de status de segurança da fundação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Status de Isolamento & Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              &bull; <strong>Isolamento de Titularidade:</strong> Cada conta possui RLS (Row-Level
              Security) restringindo a leitura e gravação estritamente aos próprios registros.
            </p>
            <p>
              &bull; <strong>Acesso Invite-Only:</strong> Apenas usuários com convites válidos
              emitidos por administradores podem ingressar.
            </p>
            <p>
              &bull; <strong>Auditoria Contínua:</strong> Eventos sensíveis de segurança são
              registrados de forma imutável no log central.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              Guia de Evolução do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              1. <strong>Definição Estrutural:</strong> Carteiras, Instituições e Contas
              bancárias/corretoras.
            </p>
            <p>
              2. <strong>Alocação de Ativos:</strong> Cadastro de instrumentos de Renda Fixa, Ações,
              FIIs e Fundos.
            </p>
            <p>
              3. <strong>Registro de Movimentações:</strong> Lançamento de aportes, resgates e
              acompanhamento de proventos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
