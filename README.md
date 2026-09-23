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

## 🔐 Variáveis de Ambiente

Copie o modelo versionado e preencha com os valores do seu ambiente:

```bash
cp .env.example .env
```

| Variável              | Obrigatória | Descrição                                                              |
| --------------------- | ----------- | ---------------------------------------------------------------------- |
| `VITE_POCKETBASE_URL` | Sim         | URL base da instância do PocketBase, lida por `src/lib/pocketbase/client.ts` |

O arquivo `.env` é ignorado pelo Git e **nunca** deve ser versionado — apenas o `.env.example`, com valores de exemplo. Variáveis com prefixo `VITE_` são embutidas no bundle do frontend durante o build e ficam visíveis para qualquer usuário da aplicação: **nunca coloque segredos nelas**. As variáveis de backend planejadas para a Fase 2 (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `SITE_URL`) estão listadas comentadas no `.env.example` e ainda não são consumidas por nenhum código deste repositório.

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento (porta configurada no Vite: 8080)
pnpm run dev
# ou
pnpm start
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:8080](http://localhost:8080).

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

- **Fundação Visual e Estrutural Concluída**: Estrutura visual completa, paleta profissional com suporte a tema Claro, Escuro (*Deep Obsidian*) e Automático, layout responsivo (Desktop Sidebar e Mobile Drawer), navegação e todas as rotas mapeadas com estados vazios instrutivos.
- **Estado da Autenticação**: A fundação estrutural e o cliente PocketBase estão integrados, mas a autenticação e fluxos reais serão implementados e ativados em fase posterior (Fase 2). Não há sessões simuladas, tokens fixos, usuários mockados nem sucesso falso.
- **Catálogo e Tipos de Ativos**: Detalhamento completo de classes de ativos, títulos de renda fixa com aplicação por valor, vencimento, indexador e regras contábeis em [docs/ASSET_TYPES.md](docs/ASSET_TYPES.md).
- **Backend Funcional com PocketBase**: Coleções e regras de negócio integradas em `pocketbase/migrations/` e rotas seguras em `pocketbase/hooks/`.
- **E-mails Transacionais com Resend**: Hook de convites integrado via API do Resend com fallback suave quando credenciais não estiverem configuradas.
