import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { ShieldAlert, KeyRound, UserPlus, Info } from 'lucide-react'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''
  const [tokenInput, setTokenInput] = React.useState(tokenFromUrl)

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
            <Alert className="py-2.5 text-xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">
                Funcionalidade em Implementação
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-relaxed">
                O fluxo de validação e ativação de convites estará disponível em fase posterior após
                o provisionamento do backend de convites. No momento, o cadastro de novos usuários
                está temporariamente indisponível.
              </AlertDescription>
            </Alert>

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

            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-xs font-semibold">
                Token do Convite
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="token"
                  type="text"
                  placeholder="Aguardando liberação do serviço..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="pl-9 h-10 text-xs uppercase font-mono"
                  disabled
                />
              </div>
            </div>

            <Button
              type="button"
              disabled
              className="w-full h-10 text-xs font-semibold cursor-not-allowed"
            >
              <span>Cadastro Temporariamente Indisponível</span>
            </Button>
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
