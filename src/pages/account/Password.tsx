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
import { KeyRound, Info } from 'lucide-react'

export default function AccountPasswordPage() {
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

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
          <form onSubmit={(e) => e.preventDefault()}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Atualizar Credencial</CardTitle>
              <CardDescription className="text-xs">
                Defina uma combinação segura com letras, números e símbolos
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="py-2.5 text-xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">
                  Funcionalidade em Implementação
                </AlertTitle>
                <AlertDescription className="text-[11px] leading-relaxed">
                  A alteração de senha autenticada estará disponível após a integração dos endpoints
                  de gestão de credenciais no backend. No momento, a alteração de senha está
                  temporariamente desabilitada.
                </AlertDescription>
              </Alert>

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
                  disabled
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
                  disabled
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
                  disabled
                />
              </div>
            </CardContent>

            <CardFooter className="border-t border-border/60 pt-4">
              <Button
                type="button"
                size="sm"
                disabled
                className="w-full h-9 text-xs font-semibold cursor-not-allowed"
              >
                Alteração Temporariamente Indisponível
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
