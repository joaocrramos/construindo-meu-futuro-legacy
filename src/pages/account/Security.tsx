import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, KeyRound, Smartphone } from 'lucide-react'

export default function AccountSecurityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Segurança da Conta"
        description="Parâmetros de proteção, histórico de acessos recentes e métodos de autenticação."
        icon={Shield}
        breadcrumbs={[{ label: 'Conta', href: '/account/profile' }, { label: 'Segurança' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Status de Proteção da Conta
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
              >
                Protegido
              </Badge>
            </div>
            <CardDescription className="text-xs">Mecanismos ativos de integridade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>&bull; Sessão assinada via token criptográfico JWT.</p>
            <p>&bull; Isolamento estrito de dados patrimoniais no nível do banco (RLS).</p>
            <p>&bull; Auditoria de tentativas de acesso mal-sucedidas.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Autenticação em Dois Fatores (2FA)
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Planejado
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Camada extra via TOTP / Authenticator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              O suporte a aplicativos autenticadores (Google Authenticator, 1Password) está
              planejado para as próximas versões da plataforma.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
