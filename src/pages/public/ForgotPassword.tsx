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
import { KeyRound, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')

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
            <Alert className="py-2.5 text-xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <KeyRound className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">
                Funcionalidade em Implementação
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-relaxed">
                O envio de links e instruções seguras de redefinição de senha estará disponível na
                fase de integração do serviço de e-mail transacional e autenticação. No momento, o
                envio está temporariamente desabilitado para evitar confirmações falsas.
              </AlertDescription>
            </Alert>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
                    disabled
                  />
                </div>
              </div>

              <Button
                type="button"
                disabled
                className="w-full h-10 text-xs font-semibold cursor-not-allowed"
              >
                Recuperação Temporariamente Indisponível
              </Button>
            </form>
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
