import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, ShieldAlert, Lock } from 'lucide-react'

export default function AdminResetDevPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Limpeza do Ambiente de Desenvolvimento"
        description="Rotina de higienização controlada para remoção de registros de teste em ambientes autorizados."
        icon={Trash2}
        badge="Recurso Bloqueado"
        breadcrumbs={[
          { label: 'Administração', href: '/admin/users' },
          { label: 'Limpeza de Dev' },
        ]}
      />

      <Alert
        variant="destructive"
        className="border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-400"
      >
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle className="text-sm font-semibold">
          Operação Estritamente Bloqueada Nesta Fase
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed mt-1">
          Por determinação de governança do MVP, a rotina de limpeza do banco está{' '}
          <strong>desabilitada e travada</strong> contra execução. Nenhum dado ou tabela pode ser
          purgado nesta etapa.
        </AlertDescription>
      </Alert>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Requisitos Mandatórios para Futura Ativação da Limpeza
          </CardTitle>
          <CardDescription className="text-xs">
            Especificação de segurança para quando o recurso for desbloqueado em ambiente isolado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/60 space-y-2">
            <p className="font-semibold text-foreground">Trava de Proteção em 5 Camadas:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Exige papel de <strong>Administrador Ativo</strong> e reautenticação obrigatória.
              </li>
              <li>
                Impossível de executar em ambiente de Produção (checagem{' '}
                <code>NODE_ENV !== 'production'</code>).
              </li>
              <li>
                Exige digitação da frase de segurança exata:{' '}
                <code className="text-rose-500 font-mono">LIMPAR AMBIENTE DESENVOLVIMENTO</code>.
              </li>
              <li>
                Exibe contagem prévia e discriminada de todas as entidades que seriam afetadas.
              </li>
              <li>
                <strong>Preserva obrigatoriamente:</strong> Schema, migrations aplicadas, pb_hooks,
                regras de acesso RLS e a conta do administrador inicial.
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <Button
              disabled
              variant="destructive"
              className="h-10 text-xs font-semibold cursor-not-allowed opacity-50"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Executar Limpeza Controlada (Bloqueado)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
