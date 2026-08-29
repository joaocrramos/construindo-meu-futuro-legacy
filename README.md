# Construindo Meu Futuro

Sistema de organização patrimonial e acompanhamento de investimentos pessoais, com foco em consolidação financeira familiar, governança e segurança de dados.

## 🎯 Objetivo do Produto

Prover aos usuários e famílias uma plataforma centralizada, intuitiva e segura para monitorar a evolução do patrimônio líquido, distribuição por classes de ativos, metas financeiras, vencimentos, liquidez e movimentações, com controle de acesso rigoroso por papéis.

## 🚀 Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces reativas
- **Vite 8** - Build tool e servidor de desenvolvimento
- **TypeScript** - Tipagem estática de ponta a ponta
- **Tailwind CSS & Shadcn UI** - Estilização utility-first com primitives acessíveis baseados em Radix UI
- **PocketBase** - Backend integrado para autenticação e banco de dados
- **React Router 7** - Roteamento cliente estruturado com Route Guards
- **Vitest** - Suíte de testes unitários e de integração
- **Oxlint & Oxfmt** - Linter e formatador de alta performance
- **Gerenciador de Pacotes**: **pnpm**

## 📋 Pré-requisitos

- Node.js 18+
- pnpm (gerenciador oficial adotado no projeto)

## 🔧 Instalação

```bash
pnpm install
```

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento (porta padrão: 5173)
pnpm run dev
# ou
pnpm start
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Testes

```bash
# Executar a suíte de testes com Vitest
pnpm test
```

### Checagem de Tipos e Linting

```bash
# Checagem estática de tipos com TypeScript
pnpm exec tsc --noEmit

# Análise estática com Oxlint
pnpm run lint

# Correção automática de problemas no lint
pnpm run lint:fix

# Formatação de código
pnpm run format
```

### Build e Preview

```bash
# Build para produção (gerado na pasta dist/)
pnpm run build

# Visualizar build de produção localmente
pnpm run preview
```

## 📁 Estrutura Principal de Diretórios

```
.
├── src/
│   ├── components/       # Layouts (AppLayout, PublicLayout), Route Guards e UI Kit
│   │   └── ui/           # Primitivas shadcn/ui (Radix UI)
│   ├── config/           # Configurações de navegação e constantes globais
│   ├── contexts/         # Contextos React (AuthContext, ThemeContext)
│   ├── hooks/            # Custom hooks (use-mobile, use-realtime, use-toast)
│   ├── lib/              # Utilitários, formatadores pt-BR, cliente PocketBase e error handler
│   ├── pages/            # Páginas da aplicação divididas por área de negócio:
│   │   ├── public/       # Portal inicial, Login, Convite, Primeiro Acesso, Recuperação de Senha
│   │   ├── overview/     # Dashboard, Resumo, Evolução, Distribuição, Alertas, Vencimentos, Metas
│   │   ├── wealth/       # Carteiras, Contas, Instituições, Ativos, Posições, Movimentações, etc.
│   │   ├── admin/        # Gestão de Usuários, Convites, Permissões, Auditoria, Segurança
│   │   └── account/      # Perfil do Titular, Segurança, Senha, Sessões, Aparência, Ajuda
│   └── test/             # Testes unitários da fundação
├── public/               # Ativos estáticos públicos (favicons, og-image)
├── pocketbase/           # Migrations e hooks do backend
├── docs/                 # Documentação técnica e registros de arquitetura (ADRs)
└── package.json          # Metadados e dependências do projeto
```

## 📌 Estado Atual da Implementação

- **Fundação Concluída**: Estrutura visual completa, paleta profissional com suporte a tema Claro, Escuro (*Deep Obsidian*) e Automático, layout responsivo (Desktop Sidebar e Mobile Drawer), navegação e todas as rotas mapeadas com estados vazios instrutivos.
- **Autenticação Real**: Conectada ao cliente PocketBase. Não há dados nem sessões simuladas/mockadas.
- **Modelo Invite-Only**: O cadastro por convite está desabilitado na interface até que a collection de convites e o serviço transacional sejam provisionados na Fase 2.
