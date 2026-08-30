import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Laptop, Info, ShieldAlert } from 'lucide-react'

export default function AccountSessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessões Ativas"
        description="Dispositivos e navegadores com autorização de acesso ao seu painel."
        icon={Laptop}
        breadcrumbs={[{ label: 'Conta', href: '/account/profile' }, { label: 'Sessões Ativas' }]}
      />

      <div className="space-y-4 max-w-2xl">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Gestão de Dispositivos e Sessões
            </CardTitle>
            <CardDescription className="text-xs">
              Controle de dispositivos autenticados e revogação remota de tokens de acesso
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="py-2.5 text-xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">
                Funcionalidade em Implementação
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-relaxed">
                A listagem em tempo real e a revogação de sessões ativas estarão disponíveis após a
                modelagem dos registros de sessão e auditoria no backend. No momento, o
                gerenciamento remoto de sessões está temporariamente desabilitado.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="border-t border-border/60 pt-4">
            <Button
              type="button"
              size="sm"
              disabled
              className="w-full sm:w-auto h-9 text-xs font-semibold cursor-not-allowed"
            >
              Gestão de Sessões Temporariamente Indisponível
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
