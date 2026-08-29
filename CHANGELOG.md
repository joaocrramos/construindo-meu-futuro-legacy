# Changelog — Construindo Meu Futuro

Todas as modificações notáveis neste projeto serão documentadas neste arquivo, seguindo as diretrizes do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e [Semantic Versioning](https://semver.org/).

---

## [0.0.11] - 2026-08-29 (Correções de QA e alinhamento de versão)

### Corrigido (Fixed)

- **Remoção de código morto (reincidência)**: `src/lib/skipAi.ts` havia retornado ao repositório sem referências ativas. O arquivo foi removido novamente. Nenhum import, rota, teste ou configuração aponta para ele.
- **Correção da contagem de testes em `docs/TESTING.md`**: o documento registrava 20 testes (e 3 para `formatters.test.ts`). A contagem real, obtida da saída do runner, é de **36 testes em 6 arquivos**; os "3" correspondiam a blocos `describe` aninhados, não a casos de teste. Nenhum teste foi adicionado ou removido para ajustar o número.
- **Documentação da descoberta de testes e das limitações de cobertura**: `docs/TESTING.md` passa a registrar como o Vitest descobre os arquivos, a ausência de `skip`/`only`, a ausência de CI e o que não é coberto (autenticação real, banco vazio, Resend, E2E, cobertura).
- **Alinhamento de versão**: `CHANGELOG.md` alinhado ao `package.json` (`0.0.11`), conforme a regra 2 da ADR-006. A versão do produto não foi incrementada nesta tarefa.

### Observações

- O seletor ambíguo em `src/test/disabledFlowsRegression.test.tsx` e os imports não utilizados já haviam sido corrigidos em `411b200`; nenhuma alteração adicional foi necessária nesses pontos.
- O seletor do campo de nova senha permanece `/^Nova Senha/i`. A âncora final (`/^Nova Senha$/i`) não pode ser usada porque o label real é `Nova Senha (mín. 8 caracteres)`; a âncora inicial já é suficiente para desambiguar de `Confirmar Nova Senha`.
- Nenhuma alteração em banco, migrations, collections, autenticação, Resend ou domínio patrimonial.

---

## [0.0.10] - 2026-08-29 (Correções de versionamento)

### Corrigido (Fixed)

- **Todas as versões coincidem agora**:

## [0.0.9] - 2026-08-29 (Correções da Auditoria da Fundação)

### Corrigido (Fixed)

- **Configuração e Execução Real dos Testes de Regressão**:
  - Adicionado `vitest.config.ts` com configuração do ambiente `jsdom` e resolução de alias `@/`.
  - Movidas as dependências `@testing-library/react` e `vitest` exclusivamente para `devDependencies`.
  - Instalado `jsdom` em `devDependencies` para permitir a montagem e renderização real de componentes React durante a suíte de testes.
  - Executados e validados 100% dos testes da suíte (6 arquivos, 20 testes ao total).
- **Remoção de Código Morto**:
  - Exclusão do arquivo não utilizado `src/lib/skipAi.ts` após verificação estrita de ausência de referências no codebase.
- **Linter e Análise Estática**:
  - Reativada a categoria `correctness: "error"` no arquivo `.oxlintrc.json`.
  - Análise estática do Oxlint executada com 0 erros e 0 avisos em todo o projeto.
- **Governança de Versionamento e Documentação**:
  - Alinhado `CHANGELOG.md` com a versão `0.0.9` presente no `package.json`.
  - Registrada a regra de governança de versionamento (ADR-006) em `docs/DECISIONS.md`.
  - Atualizado `docs/TESTING.md` com os resultados, detalhamento de suítes e categorização comprovada dos testes.

---

## [0.0.8] - 2026-08-29 (Auditoria e Correções da Fundação)

### Alterado (Changed)

- **Eliminação Completa de Simulações de Sucesso sem Backend**:
  - `src/pages/public/ForgotPassword.tsx`: Removido `setTimeout` e exibição simulada de "Instruções enviadas". O formulário agora apresenta aviso explícito de funcionalidade em implementação com campos e botão desabilitados.
  - `src/pages/public/FirstAccess.tsx`: Removida simulação de ativação e timer de redirecionamento. O formulário agora informa que a funcionalidade será ativada na fase de autenticação.
  - `src/pages/account/Password.tsx`: Removida mensagem falsa de "Senha Alterada" e `setTimeout`. Inputs e botão foram desabilitados com aviso claro.
  - `src/pages/account/Profile.tsx`: Removido feedback simulado de "Salvo!". Inputs e botão foram desabilitados até a criação dos endpoints na Fase 2.
- **Alinhamento Documental e de Configurações**:
  - `README.md`: Corrigida a porta padrão para 8080 (conforme `vite.config.ts`), alinhado o estado da autenticação (fundação visual/estrutural concluída; backend funcional e autenticação real a serem implementados em fase posterior), e documentada a ausência de migrations aplicadas e ausência de integração efetiva com Resend.
  - `docs/DATABASE_SCHEMA.md`: Removida contagem fixa de collections; documento refatorado para deixar explícito que se trata de proposta de planejamento para a Fase 2, sem collections de negócio criadas ou migrations aplicadas.
  - `pocketbase/migrations/README.md`: Esclarecido que nenhuma migration foi criada ou aplicada no PocketBase e que o documento representa planejamento arquitetural.
  - `docs/TESTING.md`: Atualizados comandos com `pnpm`, adicionada classificação rigorosa dos testes e detalhada a cobertura dos novos testes de regressão.
  - `docs/DEVELOPMENT_WORKFLOW.md`: Atualizados comandos de desenvolvimento para utilizar exclusivamente o gerenciador oficial `pnpm`.

### Adicionado (Added)

- **Suíte de Testes de Regressão da Autenticação e Segurança**:
  - `src/test/authRegression.test.tsx`: Testes automatizados executáveis garantindo que falhas do PocketBase nunca resultem em login, nunca criem sessão, nunca gravem token, nunca concedam roles ou acesso administrativo, que `isAdmin` nunca retorne verdadeiro sem role admin confiável, e que sessões e tokens mockados não existam.
  - `src/test/disabledFlowsRegression.test.tsx`: Testes automatizados cobrindo todas as telas com fluxos desabilitados (`Register`, `ForgotPassword`, `FirstAccess`, `AccountPassword`, `AccountProfile`), validando a ausência de mensagens falsas de sucesso e a presença de avisos instrutivos.

## [0.0.5] - Limpeza da Fundação do Projeto

### Alterado (Changed)

- **Remoção de Código Morto**: Exclusão de arquivos de template não utilizados e sem referências.
- **Segurança e Eliminação de Fallback Mock**:
  - Remoção completa do fallback de administrador local, tokens JWT mockados e gravação de sessões falsas no `localStorage` em `AuthContext`.
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
  - `docs/DATABASE_SCHEMA.md`: Proposta arquitetural de modelo relacional para a Fase 2.
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
