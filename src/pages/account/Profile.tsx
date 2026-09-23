import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  Mail,
  Shield,
  Save,
  Check,
  KeyRound,
  Palette,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import pb from '@/lib/pocketbase/client'

export function AccountProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const defaultTab = tabParam === 'password' || tabParam === 'appearance' ? tabParam : 'dados'
  const [activeTab, setActiveTab] = React.useState(defaultTab)

  React.useEffect(() => {
    if (tabParam && ['dados', 'password', 'appearance'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    setSearchParams(val === 'dados' ? {} : { tab: val }, { replace: true })
  }

  const { user, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()

  // Profile data tab state
  const [name, setName] = React.useState(user?.name ?? '')
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savedProfile, setSavedProfile] = React.useState(false)

  // Password tab state
  const [oldPassword, setOldPassword] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [passwordConfirm, setPasswordConfirm] = React.useState('')
  const [showOldPassword, setShowOldPassword] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  // Theme preview / selection
  const [selectedTheme, setSelectedTheme] = React.useState(theme)
  const [savedTheme, setSavedTheme] = React.useState(false)

  React.useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  React.useEffect(() => {
    setSelectedTheme(theme)
  }, [theme])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfile({ name: name.trim() })
      setSavedProfile(true)
      toast.success('Perfil atualizado com sucesso!')
      setTimeout(() => setSavedProfile(false), 2000)
    } catch {
      toast.error('Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setSavingProfile(false)
    }
  }

  const validatePasswordRules = (pwd: string) => ({
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
  })

  const rules = validatePasswordRules(password)
  const allRulesPass = Object.values(rules).every(Boolean)
  const passwordsMatch = password.length > 0 && password === passwordConfirm

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Sessão expirada. Faça login novamente.')
      return
    }
    if (!allRulesPass) {
      toast.error('A nova senha não atende a todos os requisitos de segurança.')
      return
    }
    if (!passwordsMatch) {
      toast.error('A confirmação de senha não confere.')
      return
    }

    setSavingPassword(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword,
        password,
        passwordConfirm,
      })
      toast.success('Senha atualizada com sucesso!')
      setOldPassword('')
      setPassword('')
      setPasswordConfirm('')
    } catch (err: unknown) {
      const errorObj = err as {
        data?: { data?: Record<string, { message?: string }>; message?: string }
        message?: string
      }
      const fieldErrors = errorObj?.data?.data
      if (fieldErrors?.oldPassword) {
        toast.error('Senha atual incorreta.')
      } else if (fieldErrors?.password) {
        toast.error(fieldErrors.password.message || 'Senha inválida.')
      } else {
        toast.error(errorObj?.data?.message || 'Falha ao atualizar a senha.')
      }
    } finally {
      setSavingPassword(false)
    }
  }

  const handleThemeApply = (newTheme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(newTheme)
    setTheme(newTheme)
    setSavedTheme(true)
    toast.success('Preferência de tema salva!')
    setTimeout(() => setSavedTheme(false), 2000)
  }

  const initials = (user?.name ?? user?.email ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const memberSince = user?.created
    ? formatDistanceToNow(new Date(user.created), { addSuffix: true, locale: ptBR })
    : 'data indisponível'

  const mustChangePassword = Boolean(user?.must_change_password)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil"
        description="Gerencie seus dados cadastrais, altere sua senha de acesso e personalize a aparência do sistema."
        icon={User}
        badge="Conta"
        breadcrumbs={[
          { label: 'Visão Geral', href: '/overview' },
          { label: 'Conta' },
          { label: 'Meu Perfil' },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-4">
        {/* Coluna Esquerda: Cartão Resumo do Usuário */}
        <Card className="md:col-span-1 border-border/80 h-fit">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                <AvatarImage src={user?.avatar} alt={user?.name ?? 'Avatar'} />
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-base truncate">{user?.name || 'Usuário'}</CardTitle>
            <CardDescription className="text-xs break-all">{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span>
                Função:{' '}
                <strong className="text-foreground capitalize">{user?.role ?? 'Investidor'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">Membro {memberSince}</p>
          </CardContent>
        </Card>

        {/* Coluna Direita: Três Abas (Dados, Alterar Senha, Aparência) */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid grid-cols-3 max-w-md">
              <TabsTrigger value="dados" className="flex items-center gap-1.5 text-xs">
                <User className="h-3.5 w-3.5" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="password" className="flex items-center gap-1.5 text-xs">
                <KeyRound className="h-3.5 w-3.5" />
                Alterar Senha
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" />
                Aparência
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Dados */}
            <TabsContent value="dados">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Informações Pessoais</CardTitle>
                  <CardDescription className="text-xs">
                    Atualize o nome associado à sua conta. O e-mail de acesso é administrado
                    centralmente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-name">Nome Completo</Label>
                      <Input
                        id="profile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="max-w-md"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-email">E-mail</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={user?.email ?? ''}
                        disabled
                        className="max-w-md bg-muted/50 cursor-not-allowed"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Para alterar seu e-mail de acesso, contate um administrador do sistema.
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button type="submit" disabled={savingProfile} size="sm">
                        {savedProfile ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Salvo!
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 2: Alterar Senha */}
            <TabsContent value="password">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Alteração de Senha</CardTitle>
                  <CardDescription className="text-xs">
                    Defina uma nova senha forte para acessar sua conta pessoal com segurança.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mustChangePassword && (
                    <div
                      role="alert"
                      className="p-3 rounded-md text-xs border border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col gap-1 max-w-md"
                    >
                      <span className="font-semibold text-amber-800 dark:text-amber-300">
                        Troca Obrigatória de Senha
                      </span>
                      <span className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-300/90">
                        Por segurança, você deve definir uma nova senha definitiva antes de
                        prosseguir com o uso do sistema.
                      </span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label htmlFor="old-password">Senha Atual</Label>
                      <div className="relative">
                        <Input
                          id="old-password"
                          type={showOldPassword ? 'text' : 'password'}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="Digite sua senha atual"
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          aria-label="Alternar visibilidade da senha atual"
                        >
                          {showOldPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Digite a nova senha"
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Alternar visibilidade da nova senha"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Requisitos visuais de senha */}
                    {password.length > 0 && (
                      <div className="space-y-1 text-xs bg-muted/40 p-3 rounded-md border border-border/50">
                        <p className="font-semibold text-muted-foreground mb-1">
                          Requisitos de segurança:
                        </p>
                        <div className="flex items-center gap-1.5">
                          {rules.length ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span
                            className={
                              rules.length
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            }
                          >
                            Mínimo de 8 caracteres
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {rules.upper ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span
                            className={
                              rules.upper
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            }
                          >
                            Pelo menos uma letra maiúscula
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {rules.lower ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span
                            className={
                              rules.lower
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            }
                          >
                            Pelo menos uma letra minúscula
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {rules.number ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span
                            className={
                              rules.number
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            }
                          >
                            Pelo menos um número
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showPasswordConfirm ? 'text' : 'password'}
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          placeholder="Repita a nova senha"
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          aria-label="Alternar visibilidade da confirmação de senha"
                        >
                          {showPasswordConfirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordConfirm.length > 0 && !passwordsMatch && (
                        <p className="text-[11px] text-destructive">As senhas não coincidem.</p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={
                          savingPassword || !allRulesPass || !passwordsMatch || !oldPassword
                        }
                        size="sm"
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        {savingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: Aparência */}
            <TabsContent value="appearance">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Preferências de Aparência</CardTitle>
                  <CardDescription className="text-xs">
                    Escolha entre o tema claro, escuro ou automático sincronizado com o seu sistema
                    operacional.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => handleThemeApply('light')}
                      className={`flex flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-muted/40 transition-colors text-left ${
                        selectedTheme === 'light'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Sun className="h-6 w-6 mb-2" />
                      <span className="font-semibold text-xs text-foreground">Claro</span>
                      <span className="text-[11px] text-muted-foreground text-center mt-1">
                        Fundo branco e alto contraste diurno
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeApply('dark')}
                      className={`flex flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-muted/40 transition-colors text-left ${
                        selectedTheme === 'dark'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Moon className="h-6 w-6 mb-2" />
                      <span className="font-semibold text-xs text-foreground">Escuro</span>
                      <span className="text-[11px] text-muted-foreground text-center mt-1">
                        Descanso visual e menor emissão de luz
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeApply('system')}
                      className={`flex flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-muted/40 transition-colors text-left ${
                        selectedTheme === 'system'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Laptop className="h-6 w-6 mb-2" />
                      <span className="font-semibold text-xs text-foreground">Automático</span>
                      <span className="text-[11px] text-muted-foreground text-center mt-1">
                        Acompanha a configuração do seu dispositivo
                      </span>
                    </button>
                  </div>

                  {savedTheme && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                      <Check className="h-4 w-4" /> Preferência salva com sucesso!
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default AccountProfilePage
