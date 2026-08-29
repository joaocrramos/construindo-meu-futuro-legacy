import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, ShieldCheck, KeyRound, Globe, UserCheck } from 'lucide-react'

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Políticas Globais de Segurança"
        description="Diretrizes de autenticação, força de senhas, isolamento RLS e proteção de credenciais."
        icon={Lock}
        badge="Segurança"
        breadcrumbs={[{ label: 'Administração', href: '/admin/users' }, { label: 'Segurança' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Política de Acesso Invite-Only
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
              >
                Ativo & Obrigatório
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Mecanismo restritivo de criação de usuários
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>&bull; O cadastro livre via formulário público é permanentemente desativado.</p>
            <p>&bull; Requer token emitido por administrador com prazo de expiração de 7 dias.</p>
            <p>&bull; O e-mail do convite é congelado e intransferível.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Isolamento de Dados (RLS)
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
              >
                Ativo no Banco
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Políticas de Row-Level Security no backend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              &bull; Filtro mandatório:{' '}
              <code>@request.auth.id != '' && user_id = @request.auth.id</code>
            </p>
            <p>&bull; Nenhum usuário comum tem permissão de leitura sobre tabelas de terceiros.</p>
            <p>&bull; Tabelas administrativas protegidas por validação de papel do token JWT.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Rate Limiting & Proteção de Rotas
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Monitorado
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Proteção contra ataques de força bruta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>&bull; Limitação de tentativas de autenticação e recuperação de senha.</p>
            <p>&bull; Respostas de erro genéricas e seguras para evitar enumeração de usuários.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Administrador Inicial
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Provisionado
              </Badge>
            </div>
            <CardDescription className="text-xs">Conta de governança da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              &bull; E-mail padrão de governança: <code>admin@construindomeufuturo.com</code>
            </p>
            <p>
              &bull; Sem senhas fixas gravadas no repositório; primeiro acesso por fluxo seguro.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
