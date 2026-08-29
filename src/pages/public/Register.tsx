import * as React from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Loader2,
  ArrowRight,
  UserPlus,
  Info,
} from 'lucide-react'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tokenFromUrl = searchParams.get('token') || ''

  const [tokenInput, setTokenInput] = React.useState(tokenFromUrl)
  const [isValidatingToken, setIsValidatingToken] = React.useState(false)
  const [tokenValidated, setTokenValidated] = React.useState(false)
  const [invitedEmail, setInvitedEmail] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Validação do token recebido
  const handleValidateToken = React.useCallback(async (token: string) => {
    if (!token || token.trim().length < 6) {
      setErrorMessage('Informe um token de convite válido.')
      return
    }

    setIsValidatingToken(true)
    setErrorMessage(null)

    try {
      // Simulação da verificação de convite (conforme regra de negócio invite-only)
      // Tokens de teste válidos: "INV-DEMO-2025" ou tokens com mais de 8 caracteres
      await new Promise((res) => setTimeout(res, 600))

      if (token.toUpperCase().startsWith('INV-') || token.length >= 8) {
        setTokenValidated(true)
        setInvitedEmail('usuario.convidado@exemplo.com')
      } else {
        setErrorMessage(
          'Token de convite inválido, expirado ou já utilizado. Solicite um novo convite ao administrador.',
        )
      }
    } catch {
      setErrorMessage('Falha ao consultar servidor de convites.')
    } finally {
      setIsValidatingToken(false)
    }
  }, [])

  React.useEffect(() => {
    if (tokenFromUrl) {
      handleValidateToken(tokenFromUrl)
    }
  }, [tokenFromUrl, handleValidateToken])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!fullName || !password) {
      setErrorMessage('Preencha seu nome e defina uma senha de acesso.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('A senha deve conter no mínimo 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.')
      return
    }

    setIsValidatingToken(true)
    try {
      // Simulação de registro seguro de convite
      await new Promise((res) => setTimeout(res, 800))
      setSuccessMessage(
        'Cadastro concluído com sucesso! Você já pode realizar seu primeiro acesso.',
      )
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch {
      setErrorMessage('Não foi possível concluir o cadastro com este convite.')
    } finally {
      setIsValidatingToken(false)
    }
  }

  return (
    <PublicLayout>
      <div className="w-full max-w-md mx-auto">
        <Card className="border-border/80 shadow-lg bg-card/80 backdrop-blur-md">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground font-heading">
              Cadastro por Convite
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Acesso exclusivo concedido mediante convite emitido por um administrador
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Acesso Bloqueado</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="py-2.5 text-xs border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Sucesso</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {!tokenValidated ? (
              // ETAPA 1: Inserção e validação do Token
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/60 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span>Política de Acesso Fechado</span>
                  </div>
                  <p>
                    O sistema opera sob modelo{' '}
                    <strong className="text-foreground">Invite-Only</strong>. Para se cadastrar, é
                    obrigatório possuir um token de convite válido.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="token" className="text-xs font-semibold">
                    Token do Convite
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="token"
                      type="text"
                      placeholder="Ex: INV-DEMO-2025"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="pl-9 h-10 text-xs uppercase font-mono"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleValidateToken(tokenInput)}
                  disabled={isValidatingToken || !tokenInput}
                  className="w-full h-10 text-xs font-semibold"
                >
                  {isValidatingToken ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validando token com servidor...
                    </>
                  ) : (
                    <>
                      <span>Validar Convite</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // ETAPA 2: Preenchimento do cadastro com o e-mail pré-vinculado
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Convite Verificado</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {tokenInput.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invitedEmail" className="text-xs font-semibold">
                    E-mail Vinculado ao Convite (Somente Leitura)
                  </Label>
                  <Input
                    id="invitedEmail"
                    type="email"
                    value={invitedEmail}
                    disabled
                    className="h-10 text-xs bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold">
                    Nome Completo do Titular
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pass" className="text-xs font-semibold">
                    Definir Senha Forte (mín. 8 caracteres)
                  </Label>
                  <Input
                    id="pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPass" className="text-xs font-semibold">
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isValidatingToken}
                  className="w-full h-10 text-xs font-semibold"
                >
                  {isValidatingToken ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando credenciais...
                    </>
                  ) : (
                    'Concluir Cadastro e Ativar Conta'
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border/40 pt-4">
            <Link to="/login" className="text-[11px] text-muted-foreground hover:text-foreground">
              Já possui conta cadastrada? <strong className="text-primary">Fazer Login</strong>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </PublicLayout>
  )
}
