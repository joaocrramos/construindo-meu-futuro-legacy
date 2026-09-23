import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  ShieldAlert,
  KeyRound,
  UserPlus,
  Loader2,
  CheckCircle2,
  Lock,
  User,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { validateInvitation, acceptInvitation } from '@/services/invitations'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const tokenFromUrl = (searchParams.get('token') || '').trim()

  const [tokenInput, setTokenInput] = React.useState(tokenFromUrl)
  const [validating, setValidating] = React.useState(false)
  const [isValidToken, setIsValidToken] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [, setInviteRole] = React.useState<'admin' | 'user'>('user')
  const [validationError, setValidationError] = React.useState<string | null>(null)

  // Campos do formulário de finalização
  const [name, setName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [successComplete, setSuccessComplete] = React.useState(false)

  React.useEffect(() => {
    document.title = 'Cadastro por Convite · Construindo Meu Futuro'
  }, [])

  // Se veio token na URL, valida automaticamente
  const validateToken = React.useCallback(
    async (tok: string) => {
      if (!tok) {
        toast.error('Para se cadastrar é necessário informar um link ou token de convite válido.')
        navigate('/', { replace: true })
        return
      }

      setValidating(true)
      setValidationError(null)
      try {
        const res = await validateInvitation(tok)
        if (res.valid) {
          setIsValidToken(true)
          setInviteEmail(res.email)
          setInviteRole(res.role)
        } else {
          throw new Error('Convite inválido')
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { message?: string } })?.response?.message ||
          (err as Error)?.message ||
          'Token de convite inválido ou expirado.'
        setValidationError(msg)
        toast.error(msg)
        navigate('/', { replace: true })
      } finally {
        setValidating(false)
      }
    },
    [navigate],
  )

  React.useEffect(() => {
    if (tokenFromUrl) {
      validateToken(tokenFromUrl)
    }
  }, [tokenFromUrl, validateToken])

  const handleManualValidation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenInput.trim()) return
    validateToken(tokenInput.trim())
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Por favor, informe seu nome completo.')
      return
    }
    if (password.length < 8) {
      toast.error('A senha deve conter no mínimo 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('A confirmação de senha é diferente da senha informada.')
      return
    }

    setSubmitting(true)
    try {
      await acceptInvitation({
        token: tokenInput || tokenFromUrl,
        name: name.trim(),
        password,
      })

      setSuccessComplete(true)
      toast.success('Cadastro concluído com sucesso! Redirecionando para login...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error)?.message ||
        'Não foi possível concluir o cadastro.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
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
            {validating && (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">
                  Validando seu convite seguro...
                </p>
              </div>
            )}

            {!validating && successComplete && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-semibold text-base text-foreground">
                  Conta ativada com sucesso!
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Redirecionando você para a página de login...
                </p>
                <Button className="w-full text-xs mt-2" onClick={() => navigate('/login')}>
                  Ir para o Login
                </Button>
              </div>
            )}

            {!validating && !successComplete && !isValidToken && (
              <form onSubmit={handleManualValidation} className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/60 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
                    <span>Política de Acesso Restrito (Invite-Only)</span>
                  </div>
                  <p>
                    O sistema opera sob modelo restrito. Não é permitido autocadastro público sem
                    validação de convite ativo.
                  </p>
                </div>

                {validationError && (
                  <Alert variant="destructive" className="py-2.5 text-xs">
                    <AlertTitle className="text-xs font-semibold">Convite Inválido</AlertTitle>
                    <AlertDescription className="text-[11px]">{validationError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="token" className="text-xs font-semibold">
                    Token do Convite
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="token"
                      type="text"
                      placeholder="Cole aqui seu token de convite..."
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="pl-9 h-10 text-xs font-mono"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Se você recebeu um link com <code>?token=...</code>, o preenchimento é
                    automático.
                  </p>
                </div>

                <Button type="submit" className="w-full h-10 text-xs font-semibold">
                  Verificar e Continuar
                </Button>
              </form>
            )}

            {!validating && !successComplete && isValidToken && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
                  <p className="font-semibold">Convite Validado com Sucesso!</p>
                  <p className="text-[11px]">Cadastrando conta vinculada ao e-mail autorizado:</p>
                  <p className="font-mono font-medium text-foreground text-xs mt-1">
                    {inviteEmail}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regEmail" className="text-xs font-semibold">
                    E-mail do Convite (somente leitura)
                  </Label>
                  <Input
                    id="regEmail"
                    type="email"
                    value={inviteEmail}
                    disabled
                    className="h-10 text-xs bg-muted cursor-not-allowed select-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regName" className="text-xs font-semibold">
                    Seu Nome Completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="regName"
                      type="text"
                      placeholder="Ex.: João Carlos da Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regPass" className="text-xs font-semibold">
                    Crie uma Senha Forte
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="regPass"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo de 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 h-10 text-xs"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regConfirmPass" className="text-xs font-semibold">
                    Confirme sua Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="regConfirmPass"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a senha criada"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 h-10 text-xs"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 text-xs font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Criando sua conta...
                    </>
                  ) : (
                    'Concluir Cadastro e Ativar Acesso'
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
