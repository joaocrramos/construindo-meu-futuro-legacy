import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, Server, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'

interface EmailConfigStatus {
  resend_configured: boolean
  has_resend_api_key: boolean
  has_from_email: boolean
  from_email: string
  has_from_name: boolean
  from_name: string
  has_site_url: boolean
  site_url: string
}

export default function AdminEmailPage() {
  const [status, setStatus] = React.useState<EmailConfigStatus | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchStatus = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await pb.send<EmailConfigStatus>('/backend/v1/admin/email-status', {
        method: 'GET',
      })
      setStatus(res)
    } catch {
      setStatus({
        resend_configured: false,
        has_resend_api_key: false,
        has_from_email: false,
        from_email: 'contato@construindomeufuturo.com (padrão)',
        has_from_name: false,
        from_name: 'Construindo Meu Futuro (padrão)',
        has_site_url: false,
        site_url: 'https://construindomeufuturo.com (padrão)',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

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
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Configuração do Provedor Resend
              </CardTitle>
              {loading ? (
                <Badge variant="outline" className="text-xs">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" /> Verificando
                </Badge>
              ) : status?.resend_configured ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs">
                  Ativo & Configurado
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                >
                  Pendente no Ambiente
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Variáveis verificadas server-side (sem exposição de segredos)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="font-mono text-foreground">RESEND_API_KEY</span>
              {status?.has_resend_api_key ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Presente no Backend
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Não Configurada
                </span>
              )}
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="font-mono text-foreground">RESEND_FROM_EMAIL</span>
              <span className="text-foreground font-mono">
                {status?.from_email || 'contato@construindomeufuturo.com'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="font-mono text-foreground">RESEND_FROM_NAME</span>
              <span className="text-foreground">
                {status?.from_name || 'Construindo Meu Futuro'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-foreground">SITE_URL</span>
              <span className="text-foreground font-mono">
                {status?.site_url || 'URL da Aplicação'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Regras de Disparo Seguro e Fallback
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Diretriz Ativa
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Políticas de envio e tolerância a ausência de chaves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              &bull; <strong>Fallback Gracioso:</strong> Se{' '}
              <code className="font-mono">RESEND_API_KEY</code> não estiver configurada no ambiente,
              o sistema registra um aviso nos logs de auditoria e prossegue a emissão do convite sem
              travar a interface.
            </p>
            <p>
              &bull; <strong>Confirmação de Entrega:</strong> Quando a chave estiver presente, os
              convites são despachados diretamente via API oficial do Resend (
              <code className="font-mono">https://api.resend.com/emails</code>).
            </p>
            <p>
              &bull; <strong>Segredos Protegidos:</strong> Os valores de chaves nunca são expostos
              em endpoints de consulta ou transmitidos ao navegador do cliente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
