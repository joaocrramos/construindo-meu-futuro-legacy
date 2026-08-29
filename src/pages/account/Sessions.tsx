import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Laptop, Smartphone, LogOut, CheckCircle2 } from 'lucide-react'

export default function AccountSessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessões Ativas"
        description="Dispositivos e navegadores com autorização de acesso ao seu painel."
        icon={Laptop}
        breadcrumbs={[{ label: 'Conta', href: '/account/profile' }, { label: 'Sessões Ativas' }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Desconectar Outras Sessões
          </Button>
        }
      />

      <div className="space-y-4 max-w-2xl">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    Navegador Atual (Sessão Atual)
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                      <CheckCircle2 className="w-3 h-3" /> Conectado agora
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">Navegador Web • Desktop</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            <p>Endereço de rede verificado e chave de sessão ativa localmente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
