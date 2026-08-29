import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { ShieldCheck, Sparkles, Loader2, ArrowRight } from 'lucide-react'

export default function FirstAccessPage() {
  const navigate = useNavigate()
  const [tempCode, setTempCode] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!tempCode || !newPassword) {
      setErrorMessage('Informe o código temporário recebido e defina sua nova senha.')
      return
    }

    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await new Promise((res) => setTimeout(res, 700))
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
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
              <Sparkles className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground font-heading">
              Primeiro Acesso
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ative sua credencial administrativa ou de convidado definindo uma senha definitiva
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertTitle className="text-xs font-semibold">Falha na ativação</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="py-2.5 text-xs border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Credencial Ativada!</AlertTitle>
                <AlertDescription>Redirecionando para a tela de autenticação...</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleFirstAccess} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold">
                  Código Temporário de Acesso / Token
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Código recebido por e-mail"
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value)}
                  className="h-10 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pass" className="text-xs font-semibold">
                  Nova Senha Definitiva
                </Label>
                <Input
                  id="pass"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpass" className="text-xs font-semibold">
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="cpass"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 text-xs font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ativando credenciais seguras...
                  </>
                ) : (
                  <>
                    <span>Ativar e Salvar Senha</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border/40 pt-4">
            <Link to="/login" className="text-[11px] text-muted-foreground hover:text-foreground">
              Já possui senha definitiva? <strong className="text-primary">Fazer Login</strong>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  )
}
