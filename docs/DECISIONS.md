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

- **Status:** Aprovado e Mandatório.
- **Contexto:** O projeto necessita de diretrizes inequívocas para evitar descompasso entre o manifesto da aplicação, o registro de alterações e os contadores internos da plataforma de execução.
- **Decisão:** Adotar as seguintes regras rígidas de versionamento:
  1. A versão semântica oficial do produto é definida pelo campo `version` do `package.json`.
  2. O arquivo `CHANGELOG.md` deve acompanhar estritamente a mesma versão declarada no `package.json`.
  3. O contador interno da plataforma de deploy/hospedagem não define a versão semântica do produto.
  4. Uma nova versão do produto só deve ser criada quando houver uma alteração de produto conscientemente planejada e versionada.
  5. Commits e builds automáticos da plataforma não constituem novas versões funcionais e não devem ser tratados como versões de produto.
  6. **A regra 2 é verificada automaticamente.** O script `scripts/check-version-alignment.mjs` (`pnpm run check:version`) compara o campo `version` do `package.json` com a entrada mais recente do `CHANGELOG.md` e falha quando divergem. Ele roda no CI a cada push e pull request na `main`.
- **Consequências:** O `package.json` permanece como a única fonte de verdade da versão semântica do projeto, e o `CHANGELOG.md` deve estar estritamente alinhado a ele.

---

## ADR-008: Eliminação Definitiva de Código Morto Órfão (`skipAi.ts`)

- **Status:** Aprovado e Mandatório.
- **Contexto:** Arquivos de template ou helpers não utilizados pela aplicação (especificamente `src/lib/skipAi.ts`) vinham reaparecendo periodicamente por sincronizações ou classificações incorretas, apesar de não possuírem nenhum consumidor ou rota no produto.
- **Decisão:** Declarar `src/lib/skipAi.ts` formalmente como código morto órfão. O arquivo deve permanecer permanentemente excluído do repositório, sendo fiscalizado pela suíte de teste estrutural `src/test/deadCodeRegression.test.ts`.
- **Consequências:** Nenhuma biblioteca de chat/streaming SSE de terceiros ou template órfão sem uso deve ser reintroduzida no repositório. O CI e a suíte Vitest bloqueiam automaticamente qualquer reincidência.

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
