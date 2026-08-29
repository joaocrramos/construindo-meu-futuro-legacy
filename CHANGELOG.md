# Changelog — Construindo Meu Futuro

Todas as modificações notáveis neste projeto serão documentadas neste arquivo, seguindo as diretrizes do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e [Semantic Versioning](https://semver.org/).

---

## [0.0.5] - Limpeza da Fundação do Projeto

### Alterado (Changed)

- **Remoção de Código Morto**: Exclusão de arquivos de template não utilizados e sem referências (`src/components/Layout.tsx`, `src/pages/Index.tsx`, `src/lib/skipAi.ts`, `public/placeholder.svg`, `public/skip.png`).
- **Segurança e Eliminação de Fallback Mock**:
  - Remoção completa do fallback de administrador local (`admin@construindomeufuturo.com`), tokens JWT mockados e gravação de sessões falsas no `localStorage` em `AuthContext`.
  - Tratamento seguro de autenticação com feedback padronizado em pt-BR quando o PocketBase não puder autenticar ou estiver indisponível.
  - Ajuste na tela de Login para remoção de orientações com credenciais fixas de demonstração.
- **Fluxo de Cadastro por Convite**:
  - Desativação do fluxo simulado de convite em `Register.tsx` (removidos tokens fixos `INV-DEMO-2025`, e-mail mockado e validação por `setTimeout`).
  - Apresentação de aviso em pt-BR de funcionalidade em implementação com botão desabilitado até a modelagem do backend de convites.
- **Identidade e Metadados**:
  - Atualização do `package.json` com nome `construindo-meu-futuro` e descrição do produto.
  - Atualização do `index.html` com `lang="pt-BR"`, título "Construindo Meu Futuro" e meta description institucional.
  - Atualização do `README.md` com stack completa, gerenciador `pnpm`, documentação de scripts, portas e estrutura de pastas.
- **Configurações e Estilos**:
  - Correção do `components.json` apontando o arquivo CSS para `src/main.css`.
  - Correção no `tailwind.config.ts` adicionando a família `fontFamily.heading` vinculada a `Outfit` e `Plus Jakarta Sans` e remoção de paths inexistentes no `content`.
  - Atualização do `.gitignore` para proteção estrita de arquivos `.env` e `.env.*`.

## [0.0.4-foundation]

### Adicionado (Added)

- **Fundação Arquitetural e Estrutura de Diretórios**:
  - Organização por camadas modulares: `src/contexts/`, `src/config/`, `src/components/`, `src/pages/`, `src/lib/`, `src/test/`.
  - Configuração de tema triplo: Claro, Escuro (_Deep Obsidian_) e Automático (_Sistema_), com persistência no `localStorage` e escuta a `prefers-color-scheme`.
- **Sistema de Design Visual Sóbrio e Profissional**:
  - Paleta com foco em governança patrimonial, contraste acessível, tipografia de alta legibilidade (Plus Jakarta Sans / Outfit).
  - Primitives shadcn/ui estilizados com bordas sutis e sombras elegantes.
- **Navegação Completa e Layout Responsivo**:
  - Menu lateral persistente no Desktop com visualização de seções, colapsamento de itens e indicador de status de administrador.
  - Gaveta (_Sheet / Drawer_) adaptada e ágil para dispositivos móveis com fechamento inteligente.
  - Header superior com seletor de tema, status de ambiente seguro e menu dropdown de perfil do usuário.
- **Estruturação de Rotas de Todas as 4 Áreas de Negócio**:
  - **Visão Geral**: Dashboard, Resumo Patrimonial, Evolução do Patrimônio, Distribuição por Categoria, Alertas, Próximos Vencimentos, Progresso das Metas, Atividades Recentes.
  - **Patrimônio**: Carteiras, Instituições, Contas, Ativos, Posições, Movimentações, Transferências, Cotações, Vencimentos, Metas, Consolidação Patrimonial.
  - **Administração**: Usuários, Convites (Invite-Only), Papéis e Permissões, Auditoria, Segurança, E-mail Transacional, Configurações do Ambiente, Limpeza do Ambiente de Dev (bloqueada).
  - **Conta**: Meu Perfil, Segurança da Conta, Alteração de Senha, Sessões Ativas, Preferências de Aparência, Ajuda e Informações do Sistema.
- **Telas Públicas e Fluxo Invite-Only**:
  - Tela Inicial (_Portal de Acesso Restrito_).
  - Login com validação centralizada e feedback amigável.
  - Cadastro exclusivo condicionado à validação de token de convite (`/register?token=...`).
  - Recuperação de Senha e Primeiro Acesso com definição de credencial definitiva.
- **Páginas com Estados Vazios Estruturados**:
  - Componente `EmptyState` com ícones de domínio, orientações contextuais de "Próximo Passo Recomendado" e botões de ação para guiar o usuário na parametrização inicial.
- **Cliente PocketBase & Tratamento Centralizado de Erros**:
  - Utilitário `parseAppError` que normaliza códigos HTTP do PocketBase (400, 401, 403, 404, 429, 500) em mensagens seguras e sem vazamento de detalhes técnicos ou sensíveis.
- **Formatadores Financeiros Brasileiros (pt-BR)**:
  - `formatCurrencyBRL`: Formatação de moeda no padrão `R$ 0,00` com suporte a indicação de tipo (Bruto / Líquido), controle de sinal positivo e fallback seguro para nulos.
  - `formatPercentBRL`: Formatação percentual com vírgula decimal e sinais explícitos.
  - `formatDateBRL`: Formatação de datas no padrão `dd/mm/aaaa`.
- **Suíte de Testes com Vitest**:
  - Testes unitários para formatadores financeiros, tratamento de erros, integridade da árvore de navegação e inicialização do cliente PocketBase.
- **Documentação Técnica Abrangente**:
  - `docs/ARCHITECTURE.md`: Arquitetura do MVP, diretórios e separação de camadas.
  - `docs/DATABASE_SCHEMA.md`: Modelo relacional e schema planejado das 13 collections.
  - `docs/SECURITY.md`: Políticas de segurança, modelo Invite-Only, RLS e auditoria.
  - `docs/DEVELOPMENT_WORKFLOW.md`: Fluxo de desenvolvimento, convenções e boas práticas.
  - `docs/DECISIONS.md`: Registro de Decisões de Arquitetura (ADRs).
  - `docs/TESTING.md`: Estratégia de testes, comandos e critérios de cobertura.
  - `docs/RESET_DEVELOPMENT.md`: Especificação rigorosa para higienização de ambientes de teste.
  - `pocketbase/migrations/README.md`: Sequência lógica de migrations planejadas para fases posteriores.

### Bloqueado por Decisão de Produto (Não Executado)

- Execução de seeds artificiais na interface.
- Disparo real de e-mails via Resend.
- Aplicação de migrations no banco de dados (todas as collections e regras foram especificadas em documentação para aplicação ordenada na Fase 2).
- Execução da rotina de limpeza do ambiente de desenvolvimento.
