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
import { useAuth } from '@/contexts/AuthContext'
import { User, Mail, Phone, ShieldCheck, Check } from 'lucide-react'

export default function AccountProfilePage() {
  const { user } = useAuth()
  const [name, setName] = React.useState(user?.name || '')
  const [phone, setPhone] = React.useState(user?.phone || '')
  const [saved, setSaved] = React.useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil"
        description="Informações pessoais, dados de contato e status de identificação do titular."
        icon={User}
        breadcrumbs={[{ label: 'Conta', href: '/account/profile' }, { label: 'Meu Perfil' }]}
      />

      <div className="max-w-2xl">
        <Card className="border-border/80">
          <form onSubmit={handleSave}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Dados Cadastrais</CardTitle>
              <CardDescription className="text-xs">
                Atualize seus dados pessoais e informações de comunicação
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profEmail" className="text-xs font-semibold">
                  E-mail Principal (Bloqueado)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profEmail"
                    value={user?.email || 'admin@construindomeufuturo.com'}
                    disabled
                    className="pl-9 h-10 text-xs bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A alteração de e-mail requer validação de segurança e novo link de confirmação.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profName" className="text-xs font-semibold">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="pl-9 h-10 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profPhone" className="text-xs font-semibold">
                  Telefone Celular (Opcional)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Papel no Sistema:</span>
                </div>
                <span className="font-semibold text-foreground uppercase tracking-wide">
                  {user?.role === 'admin' ? 'Administrador' : 'Titular'}
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-[11px] text-muted-foreground">
                Alterações de privilégios não podem ser feitas pelo próprio usuário.
              </span>
              <Button type="submit" size="sm" className="h-9 text-xs">
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                    Salvo!
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
