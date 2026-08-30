# Registro de Decisões de Arquitetura (ADRs)

## ADR-001: Acesso Exclusivo por Convite (Invite-Only)

- **Status:** Aprovado e Mandatório.
- **Contexto:** A plataforma é destinada à organização de patrimônio e investimentos individuais/familiares, exigindo rigor no controle de quem ingressa no ambiente.
- **Decisão:** Desabilitar autocadastro público. Apenas convites emitidos por administradores com token criptográfico de uso único permitem o registro.
- **Consequências:** Rotas `/register` exigem validação de token em tempo real; o e-mail registrado é congelado a partir do convite original.

---

## ADR-002: Isolamento de Dados por RLS (Row-Level Security)

- **Status:** Aprovado.
- **Contexto:** Múltiplos titulares podem utilizar a mesma instância, porém nenhum dado financeiro pode vazar entre contas.
- **Decisão:** Aplicar regras de RLS no PocketBase vinculando toda entidade patrimonial a `@request.auth.id = user_id`.
- **Consequências:** Impossibilidade de consultas transversais no frontend.

---

## ADR-003: Exibição de Estados Vazios Reais (Sem Mocks Artificiais)

- **Status:** Aprovado.
- **Contexto:** Ambientes novos não devem induzir o usuário a erro com saldos ou gráficos fictícios.
- **Decisão:** Desenvolver componentes `EmptyState` que instruem o próximo passo recomendado (ex: "Cadastre sua primeira carteira") em vez de popular números aleatórios.
- **Consequências:** Clareza no onboarding e integridade da experiência do usuário.

---

## ADR-004: Persistência de Tema Triplo (Claro / Escuro / Sistema)

- **Status:** Aprovado.
- **Contexto:** Aplicações financeiras exigem conforto visual em diferentes turnos e iluminações de ambiente.
- **Decisão:** Implementar `ThemeProvider` próprio com suporte aos temas `light`, `dark` (Deep Obsidian) e `system`, sincronizado com classe `.dark` no elemento raiz e persistido no `localStorage`.
- **Consequências:** Transição suave sem flickering de carregamento.

---

## ADR-005: Formatação Financeira Nacional Padronizada

- **Status:** Aprovado.
- **Contexto:** Valores em BRL exigem separador de milhar com ponto e decimal com vírgula, com distinção entre valores brutos e líquidos.
- **Decisão:** Criar módulo central `src/lib/formatters.ts` com testes unitários cobrindo nulos, negativos e distinção de impostos.

---

## ADR-006: Governança e Regras de Versionamento do Produto

- **Status:** Aprovado e Mandatório (Revisado para desacoplar do contador de build da plataforma).
- **Contexto:** O projeto necessita de diretrizes inequívocas para evitar descompasso entre o manifesto da aplicação, o registro de alterações e os contadores internos da plataforma de execução. A redação original ancorava a governança no campo `version` do `package.json`, sob a premissa de que o arquivo fosse controlado exclusivamente pelo desenvolvimento. No entanto, na infraestrutura da plataforma Skip, o `package.json` sofre mutação e incremento automático de build a cada ciclo de persistência. Essa ancoragem causou uma esteira de descompasso contínuo (seis incrementos e cinco correções manuais em um único ciclo de trabalho).
- **Decisão:** Adotar as seguintes regras rígidas de versionamento:
  1. A versão semântica do produto é definida pelo arquivo `VERSION` na raiz do repositório.
  2. O `CHANGELOG.md` deve declarar estritamente a mesma versão do `VERSION`.
  3. O campo `version` do `package.json` é contador de build da plataforma, é incrementado automaticamente a cada persistência e **NÃO** representa a versão semântica do produto.
  4. Uma nova versão semântica só é criada por decisão consciente, editando `VERSION` e escrevendo a entrada correspondente no `CHANGELOG.md` no mesmo commit.
  5. Commits automáticos da plataforma não constituem versões funcionais e não devem ser tratados como versões de produto.
  6. **A regra 2 é verificada automaticamente.** O script `scripts/check-version-alignment.mjs` (`pnpm run check:version`) compara o conteúdo do arquivo `VERSION` com a entrada mais recente do `CHANGELOG.md`, com comparação estrita e sem tolerância. Ele roda no CI a cada push e pull request na `main`.
- **Consequências:** A governança de versão semântica fica blindada contra mutações operacionais automáticas do `package.json`. A plataforma pode incrementar o `package.json` sem quebrar o pipeline de CI, enquanto a versão semântica do produto permanece sob controle consciente de versionamento.
- **Nota Histórica / Causa Raiz da Revisão:** A redação anterior falhava porque tentava governar a versão semântica usando o único arquivo que a plataforma modifica autonomamente. Ao mover a versão semântica para o arquivo `VERSION` (preservado de forma estável pela plataforma) e desqualificar `package.json.version` como fonte de verdade de produto, o laço de descompasso é definitivamente eliminado.

---

## ADR-008: Governança de Arquivos Gerenciados pela Plataforma Skip (`skipAi.ts`)

- **Status:** Atualizado (Supera a versão anterior de rejeição por teste).
- **Contexto:** O arquivo `src/lib/skipAi.ts` é um helper fornecido e mantido pela plataforma Skip para dar suporte às capacidades nativas de streaming SSE / agentes de IA. A plataforma restaura esse arquivo automaticamente durante os ciclos de hidratação e sincronização do sandbox. Tentar removê-lo repetidamente gerava um laço infinito em que o teste `src/test/deadCodeRegression.test.ts` falhava a cada sincronização.
- **Decisão:** Reconhecer formalmente `src/lib/skipAi.ts` como arquivo de scaffolding gerenciado pela plataforma Skip (junto a `index.html` com tag de proteção, `.skip.config.json` e plugins da ferramenta). Remover o teste `src/test/deadCodeRegression.test.ts`, pois um teste que falha devido ao ciclo de hidratação determinístico da plataforma de execução produz apenas ruído. O arquivo não é importado por nenhum módulo de negócio e é completamente removido pelo tree-shaking do Vite no bundle de produção.
- **Consequências:** A suíte de testes passa a refletir apenas garantias reais de regras de negócio e estabilidade da aplicação, sem falsos-positivos provocados pela infraestrutura da plataforma.

---

## ADR-007: Integração Contínua como Fonte de Verdade da Qualidade

- **Status:** Aprovado e Mandatório.
- **Contexto:** Até a versão `0.0.11` o repositório não possuía pipeline de CI. Toda afirmação sobre testes, lint, tipagem ou build dependia de execução manual e de relato em documento, o que produziu divergências reais entre o que a documentação declarava e o que os comandos efetivamente retornavam (por exemplo: "20 testes, 0 falhas" registrado enquanto a suíte tinha 36 testes e uma falha; "0 avisos de lint" registrado com 8 avisos ativos).
- **Decisão:**
  1. O workflow `.github/workflows/ci.yml` executa, a cada push e pull request na `main`: `check:version`, `lint:ci`, `tsc --noEmit`, `test` e `build`.
  2. O resultado do CI é a **única evidência aceitável** sobre o estado de qualidade de um commit. Números de testes, contagens de avisos e status de build não devem ser afirmados em documentação sem correspondência com uma execução real.
  3. Avisos do linter são tratados como erro no CI (`oxlint src --deny-warnings`). O script `lint` local permanece permissivo para não atrapalhar o desenvolvimento.
  4. O script `pnpm run verify` reproduz localmente a mesma sequência do CI.
  5. Contadores internos da plataforma de deploy (por exemplo `deployment.lastDevBuildRef`) **não** constituem evidência de que lint, tipos, testes ou build foram executados com sucesso.
- **Consequências:** Regressões de qualidade passam a falhar no commit que as introduz. A documentação deixa de ser a fonte primária sobre o estado da suíte e passa a refletir o que o CI comprova.
