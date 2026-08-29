import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, Server } from 'lucide-react'

export default function AdminEmailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="E-mail Transacional (Resend)"
        description="Monitoramento de disparos, templates transacionais e configuração do provedor Resend."
        icon={Mail}
        badge="E-mails"
        breadcrumbs={[
          { label: 'Administração', href: '/admin/users' },
          { label: 'E-mail Transacional' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Configuração do Provedor Resend
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Planejado / Fase 2
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Variáveis gerenciadas exclusivamente no backend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <div className="flex justify-between border-b border-border/60 pb-1.5">
              <span className="font-mono text-foreground">RESEND_API_KEY</span>
              <span className="text-amber-500 font-medium">Segredo no Backend</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-1.5">
              <span className="font-mono text-foreground">RESEND_FROM_EMAIL</span>
              <span className="text-foreground">contato@construindomeufuturo.com</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-1.5">
              <span className="font-mono text-foreground">RESEND_FROM_NAME</span>
              <span className="text-foreground">Construindo Meu Futuro</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-foreground">SITE_URL</span>
              <span className="text-foreground">URL da Aplicação</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Regras de Disparo Seguro
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Diretriz Ativa
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Políticas de envio e tratamento de falhas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              &bull; <strong>Sem fallbacks fictícios:</strong> Qualquer ausência de chave interrompe
              o fluxo com erro rastreado.
            </p>
            <p>
              &bull; <strong>Confirmação de Entrega:</strong> Só considera enviado após confirmação
              200 OK do Resend.
            </p>
            <p>
              &bull; <strong>Segredos Protegidos:</strong> Chaves de API nunca são expostas ao
              frontend.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
