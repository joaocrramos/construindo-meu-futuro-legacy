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
import { KeyRound, ShieldCheck } from 'lucide-react'

export default function AccountPasswordPage() {
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.')
      return
    }

    setSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setSuccess(false), 3000)
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
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Atualizar Credencial</CardTitle>
              <CardDescription className="text-xs">
                Defina uma combinação segura com letras, números e símbolos
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="py-2 text-xs border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Senha Alterada</AlertTitle>
                  <AlertDescription>
                    Sua credencial de acesso foi atualizada com sucesso.
                  </AlertDescription>
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
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
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
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/60 pt-4">
              <Button type="submit" size="sm" className="w-full h-9 text-xs font-semibold">
                Salvar Nova Senha
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
