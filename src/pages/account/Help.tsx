import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HelpCircle, Shield, FolderLock, Sparkles, BookOpen } from 'lucide-react'

export default function AccountHelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajuda & Informações do Sistema"
        description="Diretrizes de uso, manual da fundação, estrutura de dados e suporte institucional."
        icon={HelpCircle}
        breadcrumbs={[{ label: 'Conta', href: '/account/profile' }, { label: 'Ajuda' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Perguntas Frequentes & Diretrizes
              </CardTitle>
              <CardDescription className="text-xs">
                Entenda o modelo e a operação da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full text-xs">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left font-medium">
                    Como funciona o modelo de acesso exclusivo (Invite-Only)?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Para garantir confidencialidade e segurança, novas contas não podem ser criadas
                    por formulário público. Um administrador deve emitir um convite com token
                    criptográfico vinculado exclusivamente ao seu e-mail.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left font-medium">
                    Meus dados financeiros podem ser visualizados por outros usuários?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Não. Cada usuário possui isolamento no nível de banco de dados (Row-Level
                    Security). Suas carteiras, contas, ativos e metas só são visíveis pela sua
                    própria sessão autenticada.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left font-medium">
                    Qual a diferença entre uma Carteira e uma Conta?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Uma <strong>Conta</strong> representa o local físico/jurídico onde o dinheiro ou
                    custódia está depositado (ex: Conta Corrente Itaú ou Conta XP). Uma{' '}
                    <strong>Carteira</strong> é um agrupamento conceitual e estratégico (ex: Reserva
                    de Emergência, Aposentadoria).
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/80 bg-secondary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Sobre a Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                <strong>Construindo Meu Futuro</strong> — Versão 1.0.0 (Fundação MVP).
              </p>
              <p>
                Projetado para prover clareza patrimonial com precisão, separação de liquidez e
                disciplina de alocação de ativos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
