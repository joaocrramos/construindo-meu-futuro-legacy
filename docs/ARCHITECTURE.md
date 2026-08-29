# Arquitetura do Sistema — Construindo Meu Futuro

## 1. Visão Geral e Princípios

O **Construindo Meu Futuro** é uma plataforma web orientada à organização patrimonial, consolidação de contas, custódia de investimentos e acompanhamento de metas financeiras familiares e individuais.

### Princípios Arquiteturais Fundamentais

1. **Isolamento de Titularidade (Tenant Isolation por RLS):** Cada usuário autenticado é proprietário de seus registros. Nenhuma consulta no frontend pode ler ou mutar dados de terceiros.
2. **Acesso Estritamente Restrito (Invite-Only):** Não existe criação pública de contas. Novos usuários entram apenas via convite emitido por um administrador ativo com validação de token único e intransferível.
3. **Nomenclatura Consistente:**
   - Código, models, collections, campos de banco e endpoints utilizam **Inglês** (ex: `portfolios`, `movements`, `user_id`, `created`).
   - Interface com o usuário, textos, mensagens e documentação operacional utilizam **Português do Brasil (pt-BR)**.
4. **Resiliência e Clareza Visual:** Telas sem dados exibem estados vazios funcionais (_Empty States_) que educam o usuário sobre o fluxo de preenchimento.

---

## 2. Diagrama de Camadas do Frontend

```
src/
├── components/          # Componentes visuais globais e de layout
│   ├── ui/              # Primitives shadcn/ui (Button, Card, Input, Dialog...)
│   ├── AppLayout.tsx    # Layout interno (Desktop Sidebar + Mobile Drawer)
│   ├── PublicLayout.tsx # Layout para telas públicas (Login, Register, Convite)
│   ├── PageHeader.tsx   # Cabeçalho padrão de páginas com breadcrumbs
│   ├── EmptyState.tsx   # Componente de estado vazio orientado a ação
│   ├── ConfirmDialog.tsx# Modal para ações destrutivas / confirmação por frase
│   └── ProtectedRoute.tsx # Route Guard para verificação de auth e papel
├── config/              # Configurações declarativas de navegação
│   └── navigation.ts    # Matriz completa das 4 áreas e 31 subpáginas
├── contexts/            # Provedores de estado global
│   ├── AuthContext.tsx  # Contexto de autenticação, sessão e RBAC
│   └── ThemeContext.tsx # Gerenciamento de tema (Light, Dark, System)
├── lib/                 # Utilitários e integrações
│   ├── formatters.ts    # Formatação BRL (R$ 0,00, percentuais e datas)
│   ├── errorHandler.ts  # Tratamento seguro de exceções e códigos PB
│   ├── utils.ts         # Utilitário cn (Tailwind Merge + clsx)
│   └── pocketbase/      # Cliente SDK e tipos
├── pages/               # Páginas estruturais da aplicação
│   ├── public/          # Index, Login, Register, ForgotPassword, FirstAccess
│   ├── overview/        # Dashboard e 7 páginas analíticas de Visão Geral
│   ├── wealth/          # 11 páginas de gestão patrimonial e investimentos
│   ├── admin/           # 8 páginas administrativas (restritas a admin)
│   └── account/         # 6 páginas de perfil, segurança e preferências
└── test/                # Suíte de testes automatizados (Vitest)
```

---

## 3. As 4 Áreas de Navegação

### 3.1 Visão Geral (`/overview/*`, `/dashboard`)

Painéis consolidados, gráficos de alocação patrimonial, resumo de liquidez, linha do tempo de atividades e alertas de rebalanceamento.

### 3.2 Patrimônio (`/wealth/*`)

Gestão operacional de:

- **Carteiras**: Agrupamentos estratégicos de capital.
- **Instituições**: Bancos e corretoras custodiantes.
- **Contas**: Domicílios bancários e contas de custódia.
- **Ativos**: Catálogo unificado de instrumentos (Renda Fixa, Ações, FIIs, Fundos, Imóveis).
- **Posições**: Quantidade, custo de aquisição e custódia atual.
- **Movimentações**: Aportes, retiradas, compras, vendas e proventos.
- **Transferências**: Movimentações internas entre contas do mesmo titular.
- **Cotações**: Histórico de fechamento de mercado.
- **Vencimentos**: Planejamento de liquidez por data de liquidação de títulos.
- **Metas**: Objetivos patrimoniais e marcos de independência financeira.
- **Consolidação**: Fechamento contábil e fotografia mensal.

### 3.3 Administração (`/admin/*`)

Área protegida por guarda de rota `requireAdmin`:

- Gestão de Usuários e status de contas.
- Emissão e controle do ciclo de vida de Convites (_Invite-Only_).
- Matriz RBAC de Papéis e Permissões.
- Trilha de Auditoria imutável de eventos.
- Políticas globais de Segurança e Rate Limiting.
- Configuração de E-mail Transacional com provedor Resend.
- Parâmetros do Ambiente e status do PocketBase.
- Limpeza do Ambiente de Desenvolvimento (bloqueada na fundação).

### 3.4 Conta (`/account/*`)

- Meu Perfil e identificação cadastral.
- Indicadores de Segurança e status de proteção.
- Alteração periódica de senha.
- Monitoramento de Sessões Ativas.
- Preferências de Aparência (Claro, Escuro, Automático).
- Guia de Ajuda e Informações do Sistema.
