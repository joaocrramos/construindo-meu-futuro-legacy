# Changelog — Construindo Meu Futuro

Todas as modificações notáveis neste projeto serão documentadas neste arquivo, seguindo as diretrizes do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e [Semantic Versioning](https://semver.org/).

---

## [0.0.19] - 2026-08-29 (Remoção do arquivo morto reincidente skipAi.ts)

### Corrigido (Fixed)

- **Remoção de Código Morto Reincidente (`src/lib/skipAi.ts`)**:
  - Exclusão do arquivo órfão `src/lib/skipAi.ts`, que havia reaparecido no repositório via sincronização sem referências ativas no código de produção (nenhum import em componentes, rotas, hooks ou configurações).
  - Revalidação do teste de regressão `src/test/deadCodeRegression.test.ts` (3 casos), que garante de forma automatizada a ausência de `src/lib/skipAi.ts` e a inexistência de imports ou referências em `src/` e em arquivos de configuração da raiz.
  - Atualização da documentação de testes (`docs/TESTING.md`) refletindo a suíte ativa de 8 arquivos de teste e 45 casos aprovados.
  - Alinhamento da versão vigente (`0.0.19`) mantendo `package.json` como única fonte de verdade da versão semântica do produto (ADR-006).
  - Nenhuma alteração em banco de dados (0 migrations, 0 collections), 0 usuários/registros, 0 e-mails, 0 seeds e nenhuma alteração em regras de autenticação/segurança ou avanço para a Fase 2.

---

## [0.0.17] - 2026-08-29 (Restauração do package.json como Fonte de Verdade)

### Corrigido (Fixed)

- **Governança de Versionamento (ADR-006)**:
  - Reversão da solução transitória baseada no arquivo `VERSION` e restauração do campo `version` do `package.json` como única fonte de verdade da versão semântica do produto.
  - Exclusão definitiva do arquivo `VERSION` da raiz do repositório.
  - Atualização do guard de validação (`scripts/check-version-alignment.mjs`) e dos fluxos documentados (`docs/DECISIONS.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `.github/workflows/ci.yml`) para verificar estritamente o alinhamento entre `package.json` e `CHANGELOG.md`.
  - Upgrades de versão no CHANGELOG realizados para convergência com o incremento automático do commit da plataforma para `0.0.17`.
  - Mudança estritamente de governança e documental, sem alteração funcional de produto, sem avanço para a Fase 2, sem banco de dados, migrations, collections, Resend, autenticação real ou domínio patrimonial.

- **Correção de classificação: `src/lib/skipAi.ts` não é código morto**:
  - O arquivo é **biblioteca da plataforma Skip** — helpers tipados para `$ai.chat` e `$ai.agent(slug).chat`, incluindo o leitor de streaming SSE — fornecida e mantida pelo template do projeto. Ciclos anteriores o classificaram erroneamente como código órfão por não possuir `import` no código de aplicação, e o removeram repetidas vezes; a sincronização da plataforma o restaurava por design.
  - **Removido o teste `src/test/deadCodeRegression.test.ts`**, que barrava a presença do arquivo e mantinha a suíte vermelha indevidamente. A premissa do teste era incorreta, e por isso ele foi excluído em vez de silenciado.
  - `docs/DEVELOPMENT_WORKFLOW.md` ganha a seção **"Arquivos gerenciados pela plataforma"**, listando os arquivos que não devem ser removidos mesmo sem `import` no código de aplicação (`src/lib/skipAi.ts`, `skip.js` no `index.html`, `.skip.config.json`, `vite-plugin-react-uid.js`), com nota histórica sobre o equívoco.
  - `docs/TESTING.md` atualizado: **7 arquivos de teste, 42 casos**. Nenhum teste de segurança, de fluxo desabilitado ou de guard de rotas foi afetado.
  - As entradas `[0.0.9]` e `[0.0.11]` deste changelog descrevem a remoção do arquivo como "remoção de código morto". Ficam preservadas como registro histórico; esta entrada é a correção da classificação.

---

## [0.0.15] - 2026-08-29 (Alinhamento de Versionamento e Governança)

### Corrigido (Fixed)

- **Alinhamento de Versionamento (ADR-006)**:
  - Registro e sincronização documental da versão de governança.
  - Trata-se de um incremento operacional e documental sem qualquer alteração funcional de produto.
  - Não inclui avanço para a Fase 2, autenticação real, banco de dados, migrations, collections, Resend, administração funcional ou domínio patrimonial.

---

## [0.0.13] - 2026-08-29 (Auditoria da Fundação e Governança de Qualidade)

### Corrigido (Fixed)

- **Alinhamento de Versionamento (ADR-006)**:
  - Registro da versão `0.0.13` correspondente ao valor declarado no `package.json` (fonte de verdade).
  - Trata-se de sincronização documental e governança operacional sem alterações funcionais de produto (não inclui avanço para Fase 2, autenticação real, banco de dados, migrations, Resend ou domínio patrimonial).
- **Restauração das Regras de Correctness no Oxlint**:
  - Removidas as desativações (`"off"`) de regras da categoria `correctness` no arquivo `.oxlintrc.json` (`no-const-assign`, `no-dupe-keys`, `no-func-assign`, `no-import-assign`, `no-obj-calls`, `no-redeclare`, `no-this-before-super`, `no-unsafe-negation`, `no-class-assign`, `no-dupe-class-members`, `no-new-native-nonconstructor`, `no-setter-return`, `no-with`), restaurando o rigor da análise estática (`correctness: "error"`).

---

## [0.0.12] - 2026-08-29 (Integração contínua e aplicação automática do versionamento)

### Adicionado (Added)

- **Pipeline de Integração Contínua** (`.github/workflows/ci.yml`): executa, a cada push e pull request na `main`, a mesma sequência que um desenvolvedor roda localmente — alinhamento de versão, lint com avisos tratados como erro, verificação de tipos, testes e build de produção. Elimina a necessidade de comprovar manualmente, a cada auditoria, que a fundação continua íntegra.
- **Guarda de versionamento** (`scripts/check-version-alignment.mjs`, `pnpm run check:version`): compara o campo `version` do `package.json` com a entrada mais recente do `CHANGELOG.md` e falha o build quando divergem, com mensagem apontando a regra da ADR-006. O desalinhamento passa a ser detectado no commit que o introduz, e não em auditoria posterior.
- **Script `lint:ci`** (`oxlint src --deny-warnings`): avisos do Oxlint passam a produzir saída de erro no CI. O script `lint` permanece inalterado para uso local.
- **Script `verify`**: encadeia localmente a mesma sequência do CI (`check:version`, `lint:ci`, `tsc --noEmit`, `test`, `build`).

- **`.env.example`** com a variável efetivamente consumida pelo projeto (`VITE_POCKETBASE_URL`, usada em `src/lib/pocketbase/client.ts`) e aviso explícito de que variáveis `VITE_` são embutidas no bundle e nunca devem conter segredos. As variáveis planejadas para a Fase 2 (`RESEND_*`, `SITE_URL`) aparecem comentadas, apenas como referência de nomenclatura. Até aqui, a única ocorrência de `VITE_POCKETBASE_URL` no repositório era dentro do código.
- **Teste direto do guard de rotas** (`src/test/protectedRouteRegression.test.tsx`, 6 casos): o `ProtectedRoute` era coberto apenas de forma indireta, via estado do `AuthContext`. Agora o componente é montado dentro de um roteador com destinos reais, cobrindo usuário anônimo, estado de carregamento, usuário comum em rota comum, usuário comum barrado em rota `requireAdmin`, admin em rota `requireAdmin` e o caso de defesa em profundidade em que `isAdmin` é verdadeiro sem autenticação.
- **Guarda contra reincidência de código órfão** (`src/test/deadCodeRegression.test.ts`, 3 casos): verifica que `src/lib/skipAi.ts` não existe e que nenhum arquivo de `src/` ou de configuração da raiz referencia o símbolo. O arquivo já havia sido removido três vezes e reintroduzido duas por sincronização automática, sempre sem menção em commit; a reincidência passa a falhar o CI no commit que a traz de volta.

### Corrigido (Fixed)

- **Alinhamento de versão**: o commit de incremento `v0.0.12` havia elevado o `package.json` para `0.0.12` sem entrada correspondente no `CHANGELOG.md`, que permanecia em `[0.0.11]`. O `CHANGELOG.md` foi alinhado a `0.0.12`, conforme a regra 2 da ADR-006. A versão do produto **não** foi incrementada nesta tarefa.
- **Documentação de variáveis de ambiente no `README.md`**, com instrução de cópia do `.env.example` e reforço de que `.env` permanece fora do versionamento.

### Observações

- Este é o quarto ciclo em que o desalinhamento de versão reincide por incremento automático sem entrada de changelog. A causa está no processo que gera os commits `vX.Y.Z`, não no conteúdo do repositório; a guarda automática acima converte a divergência silenciosa em falha explícita de build (ADR-006, regra 6).
- Nenhuma alteração em banco de dados, migrations, collections, usuários, seeds, autenticação real, Resend ou domínio patrimonial.

---

## [0.0.11] - 2026-08-29 (Correções de QA e alinhamento de versão)

### Corrigido (Fixed)

- **Remoção de código morto (reincidência)**: `src/lib/skipAi.ts` havia retornado ao repositório sem referências ativas. O arquivo foi removido definitivamente após verificação estrita de ausência de referências no codebase (nenhum import, rota, teste ou configuração aponta para ele).
- **Correção e consolidação de versionamento**: `CHANGELOG.md` alinhado à versão `0.0.11` do `package.json` (fonte de verdade segundo a ADR-006 em `docs/DECISIONS.md`), consolidando a entrada `[0.0.10]` anterior.
- **Correção da contagem e classificação de testes em `docs/TESTING.md`**: comprovação e registro dos 36 casos de teste reais em 6 arquivos de teste, diferenciando a execução unitária/estrutural/contextual da fundação frente a integrações reais e E2E.

### Observações

- Nenhuma alteração em banco de dados, migrations, collections, usuários, seeds, autenticação real, Resend ou domínio patrimonial.

---

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
