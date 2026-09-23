import * as React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, user } = useAuth()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  React.useEffect(() => {
    document.title = 'Acesso ao Sistema · Construindo Meu Futuro'
  }, [])

  React.useEffect(() => {
    if (isAuthenticated) {
      // Se o usuário precisa obrigatoriamente trocar de senha no primeiro login,
      // redireciona para a tela /account/password (decisão de UX e segurança do primeiro acesso).
      if (user?.must_change_password) {
        navigate('/account/password', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    }
  }, [isAuthenticated, user?.must_change_password, navigate, from])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage('Preencha seu e-mail e senha para continuar.')
      return
    }

    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.success) {
        // Se o usuário precisa obrigatoriamente trocar de senha no primeiro login,
        // redireciona diretamente para a tela /account/password.
        if (res.must_change_password) {
          navigate('/account/password', { replace: true })
        } else {
          navigate(from, { replace: true })
        }
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.')
      }
    } catch {
      setErrorMessage('Não foi possível conectar ao servidor. Tente novamente mais tarde.')
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
              <Lock className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground font-heading">
              Acesso ao Sistema
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Insira suas credenciais cadastradas para entrar no seu ambiente
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <Alert variant="destructive" className="py-2.5 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  E-mail institucional / cadastrado
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
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Senha de acesso
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10 text-xs"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 text-xs font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando autenticação...
                  </>
                ) : (
                  <>
                    <span>Entrar no Painel</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-[11px] text-muted-foreground">
                Possui um convite de acesso?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Ativar conta com token
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </PublicLayout>
  )
}
