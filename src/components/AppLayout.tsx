import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { navigationConfig, NavSection } from '@/config/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  ShieldAlert,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Menu,
  ChevronRight,
  User,
  Palette,
  Sparkles,
} from 'lucide-react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const mainRef = React.useRef<HTMLElement>(null)

  // Gestão de foco acessível na troca de rotas
  React.useEffect(() => {
    if (mainRef.current) {
      // Prioriza focar no primeiro heading (h1/h2) se existir, senão foca no main
      const heading = mainRef.current.querySelector<HTMLElement>('h1, h2')
      if (heading) {
        if (!heading.getAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1')
        }
        heading.focus()
      } else {
        mainRef.current.focus()
      }
    }
  }, [location.pathname])

  // Filtra seções baseadas no privilégio de admin
  const visibleSections = navigationConfig.filter(
    (sec) => !sec.requireAdmin || (sec.requireAdmin && isAdmin),
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Link de acessibilidade: Pular para o conteúdo principal */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg text-xs font-semibold"
      >
        Pular para o conteúdo principal
      </a>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-border bg-card/60 backdrop-blur-md shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-none">
                Construindo Meu Futuro
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                PATRIMÔNIO & INVESTIMENTOS
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {visibleSections.map((section: NavSection) => (
            <div key={section.id} className="space-y-1">
              <h4 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {section.title}
              </h4>
              <div className="space-y-0.5 pt-1">
                {section.items
                  .filter((item) => !item.requireAdmin || (item.requireAdmin && isAdmin))
                  .map((item) => {
                    const isActive = location.pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
                        />
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer in Sidebar */}
        <div className="p-3 border-t border-border bg-card/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <span className="sr-only">Menu do usuário</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-medium">{user?.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                    {isAdmin && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-primary">
                        Administrador
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/appearance" className="cursor-pointer">
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Aparência</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Encerrar Sessão</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* MOBILE NAVBAR & HEADER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir navegação</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card">
                <SheetHeader className="p-4 border-b border-border text-left">
                  <SheetTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Construindo Meu Futuro
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-3 space-y-5">
                  {visibleSections.map((section) => (
                    <div key={section.id} className="space-y-1">
                      <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {section.title}
                      </h4>
                      <div className="space-y-0.5 pt-1">
                        {section.items
                          .filter((item) => !item.requireAdmin || (item.requireAdmin && isAdmin))
                          .map((item) => {
                            const isActive = location.pathname === item.href
                            const Icon = item.icon
                            return (
                              <Link
                                key={item.href}
                                to={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground font-semibold'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{item.title}</span>
                              </Link>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full text-xs justify-start text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair da Conta
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <span className="text-sm font-bold truncate">Construindo Meu Futuro</span>
          </div>

          {/* Desktop breadcrumb / Page indicator placeholder */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Ambiente Seguro</span>
            <span>•</span>
            <span>Acesso Restrito a Convidados</span>
          </div>

          {/* Quick Actions / Theme / Profile Toggle */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : theme === 'light' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Laptop className="h-4 w-4" />
                  )}
                  <span className="sr-only">Alterar tema</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setTheme('light')}
                  className="cursor-pointer text-xs"
                >
                  <Sun className="mr-2 h-4 w-4" /> Claro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('dark')}
                  className="cursor-pointer text-xs"
                >
                  <Moon className="mr-2 h-4 w-4" /> Escuro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('system')}
                  className="cursor-pointer text-xs"
                >
                  <Laptop className="mr-2 h-4 w-4" /> Automático (Sistema)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                <ShieldAlert className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
        </header>

        {/* MAIN SCROLLABLE CONTENT */}
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background outline-none"
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
