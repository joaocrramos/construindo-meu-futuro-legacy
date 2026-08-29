import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings2, Database, Terminal, Cpu } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações do Ambiente"
        description="Parâmetros de execução, status do PocketBase, flags de sistema e variáveis de ambiente ativas."
        icon={Settings2}
        badge="Administração"
        breadcrumbs={[{ label: 'Administração', href: '/admin/users' }, { label: 'Configurações' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Backend & Persistência (PocketBase)
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs"
              >
                Conectado
              </Badge>
            </div>
            <CardDescription className="text-xs">Instância PocketBase v0.36</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <div className="flex justify-between border-b border-border/60 pb-1.5">
              <span>Modo de Autenticação:</span>
              <strong className="text-foreground">Token JWT</strong>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-1.5">
              <span>Auto-Cancelamento:</span>
              <strong className="text-foreground">Desativado (Multi-request)</strong>
            </div>
            <div className="flex justify-between">
              <span>RLS Ativo:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">Sim</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                Feature Flags & Ambiente
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Produção / Staging
              </Badge>
            </div>
            <CardDescription className="text-xs">Flags globais do ecossistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <div className="flex justify-between border-b border-border/60 pb-1.5">
              <span>INVITE_ONLY_MODE:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">true (Obrigatório)</strong>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-1.5">
              <span>SEED_DEMO_DATA:</span>
              <strong className="text-amber-500">false (Desativado por padrão)</strong>
            </div>
            <div className="flex justify-between">
              <span>RESET_DEV_BLOCKED:</span>
              <strong className="text-rose-500">true (Bloqueado)</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
