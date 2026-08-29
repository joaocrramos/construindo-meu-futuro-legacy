/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'

// Páginas Públicas / Acesso
import IndexPage from '@/pages/public/Index'
import LoginPage from '@/pages/public/Login'
import RegisterPage from '@/pages/public/Register'
import ForgotPasswordPage from '@/pages/public/ForgotPassword'
import FirstAccessPage from '@/pages/public/FirstAccess'
import NotFound from '@/pages/NotFound'

// Área 1: Visão Geral
import Dashboard from '@/pages/overview/Dashboard'
import SummaryPage from '@/pages/overview/Summary'
import EvolutionPage from '@/pages/overview/Evolution'
import DistributionPage from '@/pages/overview/Distribution'
import AlertsPage from '@/pages/overview/Alerts'
import DueDatesOverviewPage from '@/pages/overview/DueDates'
import GoalsOverviewPage from '@/pages/overview/Goals'
import ActivitiesPage from '@/pages/overview/Activities'

// Área 2: Patrimônio
import PortfoliosPage from '@/pages/wealth/Portfolios'
import InstitutionsPage from '@/pages/wealth/Institutions'
import AccountsPage from '@/pages/wealth/Accounts'
import AssetsPage from '@/pages/wealth/Assets'
import PositionsPage from '@/pages/wealth/Positions'
import MovementsPage from '@/pages/wealth/Movements'
import TransfersPage from '@/pages/wealth/Transfers'
import QuotesPage from '@/pages/wealth/Quotes'
import MaturitiesPage from '@/pages/wealth/Maturities'
import WealthGoalsPage from '@/pages/wealth/Goals'
import ConsolidationPage from '@/pages/wealth/Consolidation'

// Área 3: Administração
import AdminUsersPage from '@/pages/admin/Users'
import AdminInvitesPage from '@/pages/admin/Invites'
import AdminRolesPage from '@/pages/admin/Roles'
import AdminAuditPage from '@/pages/admin/Audit'
import AdminSecurityPage from '@/pages/admin/Security'
import AdminEmailPage from '@/pages/admin/Email'
import AdminSettingsPage from '@/pages/admin/Settings'
import AdminResetDevPage from '@/pages/admin/ResetDev'

// Área 4: Conta
import AccountProfilePage from '@/pages/account/Profile'
import AccountSecurityPage from '@/pages/account/Security'
import AccountPasswordPage from '@/pages/account/Password'
import AccountSessionsPage from '@/pages/account/Sessions'
import AccountAppearancePage from '@/pages/account/Appearance'
import AccountHelpPage from '@/pages/account/Help'

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="cmf-ui-theme">
    <AuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* ROTAS PÚBLICAS / ESTRUTURAIS */}
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

            {/* Área 4: Conta */}
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
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
)

export default App
