import * as React from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/PublicLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      // Simulação do fluxo de envio seguro de instruções de redefinição
      await new Promise((res) => setTimeout(res, 700))
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <div className="w-full max-w-md mx-auto">
        <Card className="border-border/80 shadow-lg bg-card/80 backdrop-blur-md">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground font-heading">
              Recuperação de Senha
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Informe seu e-mail cadastrado para receber as instruções seguras de redefinição
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {submitted ? (
              <Alert className="py-3 text-xs border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Instruções enviadas</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-1">
                  Se o e-mail <strong className="text-foreground">{email}</strong> estiver
                  cadastrado em nossa base, você receberá um link com validade temporária para
                  redefinir sua senha.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    E-mail da Conta
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 text-xs font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando solicitação...
                    </>
                  ) : (
                    'Enviar Link de Redefinição'
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border/40 pt-4">
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Link to="/login" className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para a tela de login</span>
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  )
}
