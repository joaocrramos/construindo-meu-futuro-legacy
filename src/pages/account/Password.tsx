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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ClientResponseError } from 'pocketbase'

export default function AccountPasswordPage() {
  const { user, refreshAuth } = useAuth()

  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

  const [errors, setErrors] = React.useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
    general?: string
  }>({})
  const [loading, setLoading] = React.useState(false)
  const [successBanner, setSuccessBanner] = React.useState(false)

  // Verifica se o usuário autenticado precisa obrigatoriamente trocar de senha
  const mustChangePassword = Boolean(user?.must_change_password)

  const validate = () => {
    const errs: {
      currentPassword?: string
      newPassword?: string
      confirmPassword?: string
      general?: string
    } = {}

    if (!currentPassword) {
      errs.currentPassword = 'A senha atual é obrigatória.'
    }

    if (!newPassword) {
      errs.newPassword = 'A nova senha é obrigatória.'
    } else if (newPassword.length < 8) {
      errs.newPassword = 'A nova senha deve ter no mínimo 8 caracteres.'
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'A confirmação da nova senha é obrigatória.'
    } else if (newPassword && newPassword !== confirmPassword) {
      errs.confirmPassword = 'A confirmação de senha não confere com a nova senha informada.'
    }

    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessBanner(false)

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setLoading(true)

    const userId = user?.id || pb.authStore.record?.id

    if (!userId) {
      setErrors({
        general: 'Sessão não identificada. Por favor, faça login novamente para continuar.',
      })
      setLoading(false)
      return
    }

    try {
      // Atualiza senha via PocketBase SDK e remove o flag must_change_password
      await pb.collection('users').update(userId, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
        must_change_password: false,
      })

      // Atualiza o estado da sessão local
      await refreshAuth()

      // Limpa os campos do formulário
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccessBanner(true)

      toast.success('Senha alterada com sucesso!')
    } catch (err: unknown) {
      let friendlyError = 'Ocorreu um erro ao atualizar sua senha. Tente novamente mais tarde.'

      if (err instanceof ClientResponseError) {
        const data = err.response?.data
        if (data && typeof data === 'object') {
          const fieldErrors: typeof errors = {}

          // Tratamento de erro na senha antiga (oldPassword)
          if (data.oldPassword) {
            const code = String(data.oldPassword.code || '').toLowerCase()
            const msg = String(data.oldPassword.message || '').toLowerCase()
            if (
              code.includes('invalid_old_password') ||
              code.includes('match') ||
              msg.includes('invalid') ||
              msg.includes('match') ||
              msg.includes('incorrect') ||
              msg.includes('missing or invalid')
            ) {
              fieldErrors.currentPassword = 'A senha atual está incorreta.'
            } else {
              fieldErrors.currentPassword =
                data.oldPassword.message || 'A senha atual está incorreta.'
            }
          }
          // Tratamento de erro na nova senha (password)
          if (data.password?.message) {
            const msg = String(data.password.message).toLowerCase()
            if (msg.includes('length') || msg.includes('characters') || msg.includes('least 8')) {
              fieldErrors.newPassword = 'A nova senha deve ter no mínimo 8 caracteres.'
            } else {
              fieldErrors.newPassword = 'A nova senha não atende aos requisitos de segurança.'
            }
          }

          // Tratamento de erro na confirmação de senha (passwordConfirm)
          if (data.passwordConfirm?.message) {
            fieldErrors.confirmPassword = 'A confirmação de senha não confere com a nova senha.'
          }

          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors)
            toast.error('Verifique os campos do formulário.')
            return
          }
        }

        // Mensagens gerais de erro do PocketBase
        const rawMessage = (err.message || '').toLowerCase()
        if (rawMessage.includes('old password') || rawMessage.includes('failed to authenticate')) {
          friendlyError = 'A senha atual está incorreta.'
        } else if (rawMessage.includes('password') && rawMessage.includes('length')) {
          friendlyError = 'A nova senha deve possuir pelo menos 8 caracteres.'
        }
      }

      setErrors({ general: friendlyError })
      toast.error(friendlyError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alteração de Senha"
        description="Atualize periodicamente sua senha de acesso para manter a segurança do seu patrimônio."
        icon={KeyRound}
        breadcrumbs={[
          { label: 'Conta', href: '/account/profile' },
          { label: 'Alteração de Senha' },
        ]}
      />

      <div className="max-w-md">
        <Card className="border-border/80">
          <form onSubmit={handleSubmit} noValidate>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Atualizar Credencial</CardTitle>
              <CardDescription className="text-xs">
                Defina uma combinação segura com no mínimo 8 caracteres (letras, números e símbolos)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {mustChangePassword && (
                <Alert
                  variant="destructive"
                  className="py-3 text-xs border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                >
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Troca Obrigatória de Senha
                  </AlertTitle>
                  <AlertDescription className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-300/90 mt-1">
                    Por segurança, você deve definir uma nova senha definitiva antes de prosseguir
                    com o uso do sistema.
                  </AlertDescription>
                </Alert>
              )}

              {successBanner && (
                <Alert className="py-3 text-xs border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Senha Alterada com Sucesso
                  </AlertTitle>
                  <AlertDescription className="text-[12px] leading-relaxed text-emerald-700 dark:text-emerald-300/90 mt-1">
                    Sua credencial de acesso foi atualizada com sucesso. Utilize a nova senha nos
                    próximos acessos.
                  </AlertDescription>
                </Alert>
              )}

              {errors.general && (
                <Alert variant="destructive" className="py-2.5 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="currPass" className="text-xs font-semibold">
                  Senha Atual
                </Label>
                <Input
                  id="currPass"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    if (errors.currentPassword) {
                      setErrors((prev) => ({ ...prev, currentPassword: undefined }))
                    }
                  }}
                  className={`h-10 text-xs ${errors.currentPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  disabled={loading}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                {errors.currentPassword ? (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.currentPassword}
                  </p>
                ) : currentPassword.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Atenção: a senha diferencia maiúsculas de minúsculas.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nPass" className="text-xs font-semibold">
                  Nova Senha (mín. 8 caracteres)
                </Label>
                <Input
                  id="nPass"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (errors.newPassword) {
                      setErrors((prev) => ({ ...prev, newPassword: undefined }))
                    }
                  }}
                  className={`h-10 text-xs ${errors.newPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  disabled={loading}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                {errors.newPassword && (
                  <p className="text-[11px] text-destructive font-medium">{errors.newPassword}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cPass" className="text-xs font-semibold">
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="cPass"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                    }
                  }}
                  className={`h-10 text-xs ${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  disabled={loading}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-[11px] text-destructive font-medium">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/60 pt-4">
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="w-full h-9 text-xs font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando Senha...
                  </>
                ) : (
                  'Salvar Nova Senha'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
