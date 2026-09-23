/* Main App Component - Handles routing (using react-router-dom), code splitting, query client and other providers */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Loader2 } from 'lucide-react'

// Páginas Públicas / Acesso (chunk inicial de inicialização)
import IndexPage from '@/pages/public/Index'
import LoginPage from '@/pages/public/Login'
import RegisterPage from '@/pages/public/Register'
import ForgotPasswordPage from '@/pages/public/ForgotPassword'
import FirstAccessPage from '@/pages/public/FirstAccess'
import NotFound from '@/pages/NotFound'

// Área 1: Visão Geral (Lazy Chunks)
const Dashboard = lazy(() => import('@/pages/overview/Dashboard'))
const SummaryPage = lazy(() => import('@/pages/overview/Summary'))
const EvolutionPage = lazy(() => import('@/pages/overview/Evolution'))
const DistributionPage = lazy(() => import('@/pages/overview/Distribution'))
const AlertsPage = lazy(() => import('@/pages/overview/Alerts'))
const DueDatesOverviewPage = lazy(() => import('@/pages/overview/DueDates'))
const GoalsOverviewPage = lazy(() => import('@/pages/overview/Goals'))
const ActivitiesPage = lazy(() => import('@/pages/overview/Activities'))

// Área 2: Patrimônio (Lazy Chunks)
const PortfoliosPage = lazy(() => import('@/pages/wealth/Portfolios'))
const InstitutionsPage = lazy(() => import('@/pages/wealth/Institutions'))
const AccountsPage = lazy(() => import('@/pages/wealth/Accounts'))
const AssetsPage = lazy(() => import('@/pages/wealth/Assets'))
const PositionsPage = lazy(() => import('@/pages/wealth/Positions'))
const MovementsPage = lazy(() => import('@/pages/wealth/Movements'))
const TransfersPage = lazy(() => import('@/pages/wealth/Transfers'))
const QuotesPage = lazy(() => import('@/pages/wealth/Quotes'))
const MaturitiesPage = lazy(() => import('@/pages/wealth/Maturities'))
const WealthGoalsPage = lazy(() => import('@/pages/wealth/Goals'))
const ConsolidationPage = lazy(() => import('@/pages/wealth/Consolidation'))

// Área 3: Administração (Lazy Chunks)
const AdminUsersPage = lazy(() => import('@/pages/admin/Users'))
const AdminInvitesPage = lazy(() => import('@/pages/admin/Invites'))
const AdminRolesPage = lazy(() => import('@/pages/admin/Roles'))
const AdminAuditPage = lazy(() => import('@/pages/admin/Audit'))
const AdminBackupsPage = lazy(() => import('@/pages/admin/Backups'))
const AdminSecurityPage = lazy(() => import('@/pages/admin/Security'))
const AdminEmailPage = lazy(() => import('@/pages/admin/Email'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/Settings'))

// Rota restrita de desenvolvimento (/admin/reset-dev) - não é importada em produção
const AdminResetDevPage = import.meta.env.DEV ? lazy(() => import('@/pages/admin/ResetDev')) : null

// Área 4: Conta (Lazy Chunks)
const AccountProfilePage = lazy(() => import('@/pages/account/Profile'))
const AccountSecurityPage = lazy(() => import('@/pages/account/Security'))
const AccountPasswordPage = lazy(() => import('@/pages/account/Password'))
const AccountSessionsPage = lazy(() => import('@/pages/account/Sessions'))
const AccountAppearancePage = lazy(() => import('@/pages/account/Appearance'))
const AccountHelpPage = lazy(() => import('@/pages/account/Help'))

// Fallback visual acessível de carregamento com feedback em pt-BR
function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[300px] w-full items-center justify-center p-8"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs font-medium">Carregando seção do sistema...</p>
      </div>
    </div>
  )
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider defaultTheme="system" storageKey="cmf-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Sonner />
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* ROTAS PÚBLICAS / ESTRUTURAIS (Chunk Inicial) */}
                <Route path="/" element={<IndexPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/first-access" element={<FirstAccessPage />} />

                {/* ROTAS PROTEGIDAS (APP LAYOUT COM SIDEBAR E HEADER) */}
                {/* Área 1: Visão Geral */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview/summary"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SummaryPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview/evolution"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <EvolutionPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview/distribution"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <DistributionPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview/alerts"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AlertsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview/due-dates"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <DueDatesOverviewPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview/goals"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <GoalsOverviewPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/overview/activities"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ActivitiesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Área 2: Patrimônio */}
                <Route
                  path="/wealth/portfolios"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <PortfoliosPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/institutions"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <InstitutionsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/accounts"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/assets"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AssetsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/positions"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <PositionsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/movements"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <MovementsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/transfers"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <TransfersPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/quotes"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <QuotesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/maturities"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <MaturitiesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/goals"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <WealthGoalsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wealth/consolidation"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ConsolidationPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Área 3: Administração (Requer Admin) */}
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminUsersPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/invites"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminInvitesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/roles"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminRolesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminAuditPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/backups"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminBackupsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/security"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminSecurityPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/email"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminEmailPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AppLayout>
                        <AdminSettingsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                {/* Rota /admin/reset-dev registrada exclusivamente em ambiente de desenvolvimento */}
                {AdminResetDevPage && (
                  <Route
                    path="/admin/reset-dev"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AppLayout>
                          <AdminResetDevPage />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                )}

                {/* Área 4: Conta */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountProfilePage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account/profile"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountProfilePage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account/security"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountSecurityPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account/password"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountPasswordPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account/sessions"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountSessionsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account/appearance"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountAppearancePage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account/help"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AccountHelpPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Rota 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
)

export default App
