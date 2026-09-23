import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  Send,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  SendHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

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

interface TestEmailResponse {
  success?: boolean
  message: string
  resend_id?: string
  code?: string
  details?: string
}

export default function AdminEmailPage() {
  const [status, setStatus] = React.useState<EmailConfigStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [testEmail, setTestEmail] = React.useState('')
  const [sendingTest, setSendingTest] = React.useState(false)
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

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

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = testEmail.trim()
    if (!target || !target.includes('@') || !target.includes('.')) {
      setFeedback({
        type: 'error',
        message: 'Por favor, informe um endereço de e-mail válido para o teste.',
      })
      toast.error('Informe um e-mail válido com @ e domínio.')
      return
    }

    setSendingTest(true)
    setFeedback(null)

    try {
      const res = await pb.send<TestEmailResponse>('/backend/v1/email/test', {
        method: 'POST',
        body: { email: target },
      })

      const successMsg = res.message || `E-mail de teste enviado para ${target}`
      setFeedback({
        type: 'success',
        message: successMsg,
      })
      toast.success(successMsg)
    } catch (err: unknown) {
      let errMessage = 'Erro desconhecido ao enviar e-mail de teste.'
      if (err && typeof err === 'object') {
        const anyErr = err as { data?: { message?: string }; message?: string }
        if (anyErr.data?.message) {
          errMessage = anyErr.data.message
        } else if (anyErr.message) {
          errMessage = anyErr.message
        }
      }

      setFeedback({
        type: 'error',
        message: errMessage,
      })
      toast.error(errMessage)
    } finally {
      setSendingTest(false)
    }
  }

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
                <SendHorizontal className="h-4 w-4 text-primary" />
                Enviar E-mail de Teste
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Diagnóstico em Tempo Real
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Dispare um e-mail com as credenciais reais do Resend para testar entrega e remetente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSendTestEmail} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="test-email-input" className="text-xs font-medium">
                  E-mail de Destino
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="test-email-input"
                    type="email"
                    placeholder="ex.: seu-email@exemplo.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    disabled={sendingTest}
                    className="h-9 text-xs"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={sendingTest || !testEmail.trim()}
                    className="h-9 text-xs shrink-0"
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="h-3.5 w-3.5 mr-1.5" />
                        Enviar E-mail de Teste
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {feedback && (
              <div
                className={`p-3 rounded-md text-xs border flex items-start gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <span className="font-semibold block">
                    {feedback.type === 'success' ? 'Sucesso no Envio:' : 'Falha no Envio:'}
                  </span>
                  <span>{feedback.message}</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border/60 text-muted-foreground text-[11px] leading-relaxed">
              Dispara chamada segura via{' '}
              <code className="font-mono">POST /backend/v1/email/test</code> restrita a
              administradores e gera registro de auditoria do evento.
            </div>
          </CardContent>
        </Card>
      </div>

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
            <code className="font-mono">RESEND_API_KEY</code> não estiver configurada no ambiente, o
            sistema registra um aviso nos logs de auditoria e prossegue a emissão do convite sem
            travar a interface.
          </p>
          <p>
            &bull; <strong>Confirmação de Entrega:</strong> Quando a chave estiver presente, os
            convites são despachados diretamente via API oficial do Resend (
            <code className="font-mono">https://api.resend.com/emails</code>).
          </p>
          <p>
            &bull; <strong>Segredos Protegidos:</strong> Os valores de chaves nunca são expostos em
            endpoints de consulta ou transmitidos ao navegador do cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
