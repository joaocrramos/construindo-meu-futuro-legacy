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
import { Sparkles, Info } from 'lucide-react'

export default function FirstAccessPage() {
  const [tempCode, setTempCode] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

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
            <Alert className="py-2.5 text-xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">
                Funcionalidade em Implementação
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-relaxed">
                O fluxo de ativação do primeiro acesso e definição de senha definitiva estará
                disponível na fase de autenticação e validação segura de tokens no backend. No
                momento, a ativação está temporariamente desabilitada.
              </AlertDescription>
            </Alert>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold">
                  Código Temporário de Acesso / Token
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Aguardando liberação do serviço..."
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value)}
                  className="h-10 text-xs font-mono"
                  disabled
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pass" className="text-xs font-semibold">
                  Nova Senha Definitiva
                </Label>
                <Input
                  id="pass"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 text-xs"
                  disabled
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpass" className="text-xs font-semibold">
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="cpass"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 text-xs"
                  disabled
                />
              </div>

              <Button
                type="button"
                disabled
                className="w-full h-10 text-xs font-semibold cursor-not-allowed"
              >
                Ativação Temporariamente Indisponível
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
