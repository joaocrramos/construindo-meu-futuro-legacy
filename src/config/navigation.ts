import {
  LayoutDashboard,
  TrendingUp,
  PieChart,
  Bell,
  Calendar,
  Target,
  History,
  Wallet,
  Building2,
  CreditCard,
  Coins,
  Layers,
  ArrowLeftRight,
  ArrowUpDown,
  LineChart,
  FolderTree,
  Users,
  Mail,
  ShieldCheck,
  FileText,
  Lock,
  Settings2,
  Trash2,
  User,
  Shield,
  Laptop,
  HelpCircle,
  BarChart3,
  HardDrive,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
  description?: string
  requireAdmin?: boolean
}

export interface NavSection {
  id: 'overview' | 'wealth' | 'admin' | 'account'
  title: string
  items: NavItem[]
  requireAdmin?: boolean
}

export const navigationConfig: NavSection[] = [
  {
    id: 'overview',
    title: 'Visão Geral',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Visão consolidada do patrimônio e indicadores rápidos',
      },
      {
        title: 'Resumo Patrimonial',
        href: '/overview/summary',
        icon: Wallet,
        description: 'Totalizadores, liquidez e divisão por titularidade',
      },
      {
        title: 'Evolução do Patrimônio',
        href: '/overview/evolution',
        icon: TrendingUp,
        description: 'Histórico de valorização temporal e aportes',
      },
      {
        title: 'Distribuição por Categoria',
        href: '/overview/distribution',
        icon: PieChart,
        description: 'Alocação por classes de ativos e percentuais',
      },
      {
        title: 'Alertas',
        href: '/overview/alerts',
        icon: Bell,
        description: 'Notificações financeiras e rebalanceamento',
      },
      {
        title: 'Próximos Vencimentos',
        href: '/overview/due-dates',
        icon: Calendar,
        description: 'Prazos de resgates, proventos e obrigações',
      },
      {
        title: 'Progresso das Metas',
        href: '/overview/goals',
        icon: Target,
        description: 'Acompanhamento do atingimento de metas financeiras',
      },
      {
        title: 'Atividades Recentes',
        href: '/overview/activities',
        icon: History,
        description: 'Linha do tempo de movimentações e eventos',
      },
    ],
  },
  {
    id: 'wealth',
    title: 'Patrimônio',
    items: [
      {
        title: 'Carteiras',
        href: '/wealth/portfolios',
        icon: FolderTree,
        description: 'Agrupamentos estratégicos de ativos',
      },
      {
        title: 'Instituições',
        href: '/wealth/institutions',
        icon: Building2,
        description: 'Bancos, corretoras e custodiantes parceiros',
      },
      {
        title: 'Contas',
        href: '/wealth/accounts',
        icon: CreditCard,
        description: 'Contas bancárias, corretagem e contas globais',
      },
      {
        title: 'Ativos',
        href: '/wealth/assets',
        icon: Coins,
        description: 'Catálogo de instrumentos financeiros cadastrados',
      },
      {
        title: 'Posições',
        href: '/wealth/positions',
        icon: Layers,
        description: 'Saldos em custódia e quantidades atuais',
      },
      {
        title: 'Movimentações',
        href: '/wealth/movements',
        icon: ArrowUpDown,
        description: 'Aportes, resgates, compras, vendas e proventos',
      },
      {
        title: 'Transferências',
        href: '/wealth/transfers',
        icon: ArrowLeftRight,
        description: 'Remessas entre contas e instituições próprias',
      },
      {
        title: 'Cotações',
        href: '/wealth/quotes',
        icon: LineChart,
        description: 'Preços de fechamento e atualizações de mercado',
      },
      {
        title: 'Vencimentos',
        href: '/wealth/maturities',
        icon: Calendar,
        description: 'Controle de liquidez por data de vencimento',
      },
      {
        title: 'Metas',
        href: '/wealth/goals',
        icon: Target,
        description: 'Planejamento de independência e patrimônio alvo',
      },
      {
        title: 'Consolidação Patrimonial',
        href: '/wealth/consolidation',
        icon: BarChart3,
        description: 'Fechamentos mensais e relatórios consolidados',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administração',
    requireAdmin: true,
    items: [
      {
        title: 'Usuários',
        href: '/admin/users',
        icon: Users,
        description: 'Gestão de usuários da plataforma',
        requireAdmin: true,
      },
      {
        title: 'Convites',
        href: '/admin/invites',
        icon: Mail,
        description: 'Emissão e controle de convites de acesso exclusivo',
        requireAdmin: true,
      },
      {
        title: 'Papéis e Permissões',
        href: '/admin/roles',
        icon: ShieldCheck,
        description: 'Matriz de privilégios e controle de acesso',
        requireAdmin: true,
      },
      {
        title: 'Auditoria',
        href: '/admin/audit',
        icon: FileText,
        description: 'Registro cronológico e imutável de eventos de segurança',
        requireAdmin: true,
      },
      {
        title: 'Backup & Restore',
        href: '/admin/backups',
        icon: HardDrive,
        description: 'Snapshots completos do banco de dados e restauração de segurança',
        requireAdmin: true,
      },
      {
        title: 'Segurança',
        href: '/admin/security',
        icon: Lock,
        description: 'Políticas globais de autenticação e proteção',
        requireAdmin: true,
      },
      {
        title: 'E-mail Transacional',
        href: '/admin/email',
        icon: Mail,
        description: 'Configuração e monitoramento do serviço Resend',
        requireAdmin: true,
      },
      {
        title: 'Configurações do Ambiente',
        href: '/admin/settings',
        icon: Settings2,
        description: 'Parâmetros de execução e flags de sistema',
        requireAdmin: true,
      },
      {
        title: 'Limpeza do Ambiente de Dev',
        href: '/admin/reset-dev',
        icon: Trash2,
        description: 'Recurso restrito e bloqueado para limpeza controlada',
        requireAdmin: true,
      },
    ],
  },
  {
    id: 'account',
    title: 'Conta',
    items: [
      {
        title: 'Meu Perfil',
        href: '/profile',
        icon: User,
        description: 'Dados pessoais, identificação e preferências',
      },
      {
        title: 'Segurança da Conta',
        href: '/account/security',
        icon: Shield,
        description: 'Status de proteção e registros de acesso',
      },
      {
        title: 'Sessões Ativas',
        href: '/account/sessions',
        icon: Laptop,
        description: 'Dispositivos e conexões ativas no momento',
      },
      {
        title: 'Ajuda e Informações',
        href: '/account/help',
        icon: HelpCircle,
        description: 'Documentação da fundação e canais de suporte',
      },
    ],
  },
]
