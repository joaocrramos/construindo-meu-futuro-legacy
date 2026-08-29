import * as React from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/PublicLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  FolderLock,
  Layers,
  Sparkles,
  KeyRound,
} from 'lucide-react'

export default function IndexPage() {
  return (
    <PublicLayout>
      <div className="w-full max-w-5xl mx-auto space-y-12 text-center py-6 sm:py-12">
        {/* Badge superior */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide border border-primary/20 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PLATAFORMA FECHADA &bull; ACESSO SOMENTE POR CONVITE</span>
        </div>

        {/* Hero Section */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground font-heading">
            Organização patrimonial e investimentos com{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
              clareza e rigor
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            O <strong>Construindo Meu Futuro</strong> foi concebido para centralizar agrupamentos
            patrimoniais, contas bancárias, custódias de ativos e metas financeiras em um ambiente
            seguro e exclusivo.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 px-8 text-sm font-semibold shadow-lg shadow-primary/20"
          >
            <Link to="/login" className="flex items-center gap-2">
              <span>Acessar Meu Painel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 px-8 text-sm font-semibold"
          >
            <Link to="/register" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span>Validar Convite de Acesso</span>
            </Link>
          </Button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/40 transition-all">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FolderLock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-base">
                Controle Restrito & Seguro
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cadastro condicionado à emissão de convite nominal por administrador. Isolamento
                rigoroso onde cada titular visualiza exclusivamente seu próprio patrimônio.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/40 transition-all">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-base">Consolidação de Custódias</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Acompanhe carteiras, instituições, contas correntes, investimentos de renda fixa,
                ações, fundos e ativos imobiliários em um único fluxo.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-primary/40 transition-all">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-base">
                Planejamento de Longo Prazo
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Monitore vencimentos futuros, evolução patrimonial real, alocação por classe e o
                atingimento das metas financeiras planejadas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invite-Only Advisory Box */}
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-secondary/40 border border-border/80 flex items-start gap-3 text-left">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Não possui uma conta? </strong>
            Para manter a integridade e privacidade do ecossistema, novas contas são criadas
            exclusivamente mediante convite com token ativo emitido pela administração.
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
