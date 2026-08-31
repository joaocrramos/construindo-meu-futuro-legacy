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

## ADR-007: Integração Contínua como Fonte de Verdade da Qualidade

- **Status:** Aprovado e Mandatório.
- **Contexto:** Até a versão `0.0.11` o repositório não possuía pipeline de CI. Toda afirmação sobre testes, lint, tipagem ou build dependia de execução manual e de relato em documento, o que produziu divergências reais entre o que a documentação declarava e o que os comandos efetivamente retornavam.
- **Decisão:**
  1. O workflow `.github/workflows/ci.yml` executa, a cada push e pull request na `main`: `check:version`, `check:migrations`, `lint:ci`, `tsc --noEmit`, `test` e `build`.
  2. O resultado do CI é a **única evidência aceitável** sobre o estado de qualidade de um commit. Números de testes, contagens de avisos e status de build não devem ser afirmados em documentação sem correspondência com uma execução real.
  3. Avisos do linter são tratados como erro no CI (`oxlint src --deny-warnings`). O script `lint` local permanece permissivo para não atrapalhar o desenvolvimento.
  4. O script `pnpm run verify` reproduz localmente a mesma sequência do CI.
  5. Contadores internos da plataforma de deploy **não** constituem evidência de que lint, tipos, testes ou build foram executados com sucesso.
  6. **Regra de Reporte:** Relatórios de execução não devem conter saída de comando colada como evidência. O resultado do CI é a evidência de referência. Um relatório informa apenas: push realizado, número do run e conclusão. Contagens de teste, versões e saídas de terminal em texto livre não constituem prova e não devem ser reproduzidas.
- **Consequências:** Regressões de qualidade passam a falhar no commit que as introduz. A documentação deixa de ser a fonte primária sobre o estado da suíte e passa a refletir o que o CI comprova.
- **Nota de Causa:** Em 2026-08-30 um relatório trouxe bloco de verify fabricado citando "0.0.12" — número presente no corpo da mensagem do commit 2c85424, no histórico do próprio repositório. A saída foi reconstruída de texto lido, não de execução.

---

## ADR-018: Execução da Fase 2 em Dois Lotes com Validação Intermediária

- **Status:** Aprovado.
- **Contexto:** A modelagem financeira e contábil envolve 14 collections relacionais, fórmulas de custo médio ponderado, regras de não-invertibilidade de venda, projeções de saldo de caixa e regras RLS estritas. Aplicar 13 migrations e toda a camada de endpoints em um único lote ("big bang") sem validação intermediária acarreta alto risco de retrabalho caso seja identificada qualquer inconsistência aritmética ou de chave.
- **Decisão:** Dividir a execução da persistência e backend da Fase 2 em **dois lotes estritos**:
  - **Lote 1 (Acesso, Identidade e Núcleo Contábil):** Migrations 0001 a 0009 (`users`, `invitations`, `audit_logs`, `portfolios`, `institutions`, `accounts`, `account_balances`, `assets`, `positions`, `movements`) + endpoints `createMovement`, `recalculatePositions`, `acceptInvite` + suíte de isolamento RLS + teste-tabela de aritmética financeira com 40 cenários.
    - _Critério de Pronto do Lote 1:_ Fluxo end-to-end funcional com usuário real convidado, cadastro de conta e ativo, lançamentos de compra, venda e proventos, verificação de saldo de caixa e custo médio exatos, estorno com recomputação integral e paridade absoluta entre recálculo e cálculo incremental.
  - **Lote 2 (Transferências, Cotações, Metas e Consolidação):** Migrations 0010 a 0013 (`transfers`, `quotes`, `wealth_goals`, `consolidations`) + endpoints `createTransfer`, `createQuote` + jobs agendados de auditoria (`AUDIT_PURGE_RUN`) + consolidações mensais multi-moeda.
- **Consequências:** Redução drástica do risco de regressão estrutural, validação empírica precoce do motor contábil antes de expandir para transferências e consolidações, e garantia de estabilidade contínua a cada etapa.

---

## ADR-008: Governança de Arquivos Gerenciados pela Plataforma Skip (`skipAi.ts`)

- **Status:** Atualizado (Supera a versão anterior de rejeição por teste).
- **Contexto:** O arquivo `src/lib/skipAi.ts` é um helper fornecido e mantido pela plataforma Skip para dar suporte às capacidades nativas de streaming SSE / agentes de IA. A plataforma restaura esse arquivo automaticamente durante os ciclos de hidratação e sincronização do sandbox. Tentar removê-lo repetidamente gerava um laço infinito em que o teste `src/test/deadCodeRegression.test.ts` falhava a cada sincronização.
- **Decisão:** Reconhecer formalmente `src/lib/skipAi.ts` como arquivo de scaffolding gerenciado pela plataforma Skip. Remover o teste `src/test/deadCodeRegression.test.ts`, pois um teste que falha devido ao ciclo de hidratação determinístico da plataforma de execução produz apenas ruído. O arquivo não é importado por nenhum módulo de negócio e é completamente removido pelo tree-shaking do Vite no bundle de produção.
- **Consequências:** A suíte de testes passa a refletir apenas garantias reais de regras de negócio e estabilidade da aplicação, sem falsos-positivos provocados pela infraestrutura da plataforma.

---

## ADR-009: Fuso Horário Canônico de Negócio (`America/Sao_Paulo`)

- **Status:** Aprovado.
- **Contexto:** Fechamentos patrimoniais, fronteiras de meses civis e correspondência de cotações de mercado exigem uma referência temporal inequívoca. O uso de UTC cru provoca anomalias onde operações realizadas na noite brasileira de um dia útil (ex: 20h do dia 31) são atribuídas ao primeiro dia do mês subsequente no UTC.
- **Decisão:** Adotar `America/Sao_Paulo` como o fuso horário canônico de negócio da plataforma. O cálculo de virada de mês em `consolidations` e as consultas de cotações históricas (`<= basis_date`) devem ser normalizadas para a meia-noite e fim de dia segundo `America/Sao_Paulo` antes de qualquer persistência ou consulta.
- **Consequências:** Eliminação de inconsistências de competência contábil e de alocação de cotações entre dias úteis adjacentes.

---

## ADR-010: Desacoplamento de Páginas e Acesso a Dados (Isolamento do SDK PB)

- **Status:** Aprovado.
- **Contexto:** Acoplar componentes de tela (`src/pages/**`) diretamente ao SDK do PocketBase (`pocketbase`) dispersa regras de consulta, espalha dependência de infraestrutura por dezenas de arquivos e dificulta testes de componentes sem infraestrutura ativa.
- **Decisão:** Nenhuma página ou componente de visualização pode importar diretamente a instância do PocketBase (`import pb from '@/lib/pocketbase/client'`). O acesso a dados e chamadas remotas deve ser encapsulado exclusivamente em módulos de serviço/repositório em `src/lib/data/<recurso>.ts` (ou `src/services/<recurso>.ts`).
- **Consequências:** Camada de apresentação 100% desacoplada do cliente HTTP/SDK, simplificação drástica de mocks em testes e facilidade para migração ou evolução de endpoints.

---

## ADR-011: Lógica de Domínio como Funções Puras em TypeScript

- **Status:** Aprovado.
- **Contexto:** Lógicas contábeis e de custódia (cálculo de preço médio ponderado, validação de fórmulas $net = gross - fees - taxes$, consistência de sinais e recálculo após estornos) são o núcleo de integridade do produto. Se forem implementadas apenas como scripts embutidos em hooks do PocketBase, não podem ser exercitadas isoladamente no pipeline de testes rápidos.
- **Decisão:** Todo o algoritmo financeiro e contábil deve ser implementado como **funções puras em TypeScript** (em `src/domain/wealth/*`). Os hooks e endpoints do PocketBase atuam como adaptadores I/O finos que delegam a computação a essas funções.
- **Consequências:** A suíte de testes-tabela de aritmética financeira executa em milissegundos via Vitest localmente e no CI, sem exigir o servidor PocketBase em execução.

---

## ADR-012: Projeção Persistida de Saldo de Caixa (`account_balances`)

- **Status:** Aprovado.
- **Contexto:** Posições de ativos (`positions`) contam com projeção materializada de quantidade e custo. No entanto, o saldo de caixa vinha sendo tratado como derivado, exigindo varredura de todo o histórico da collection `movements` a cada exibição de extrato ou dashboard. Com milhares de lançamentos, essa assimetria degradaria a performance de leitura.
- **Decisão:** Criar a entidade de projeção materializada `account_balances`, vinculada a `(user_id, account_id, currency)`. Esta tabela é atualizada inline e atomicamente pelo backend a cada `createMovement` ou `createTransfer` dentro de `$app.runInTransaction`.
- **Consequências:** Consultas de saldos operacionais tornam-se $O(1)$ por conta e moeda. A função `recalculatePositions` é expandida para revalidar também o saldo de caixa integral a partir do livro-razão.

---

## ADR-013: Recomputação Obrigatória de Posição em Estornos (Não-Invertibilidade Contábil)

- **Status:** Aprovado.
- **Contexto:** Em contabilidade financeira de investimentos, a operação de venda reduz a quantidade em custódia mantendo o custo médio inalterado, descartando a informação histórica do preço de aquisição do lote vendido. Estornar uma venda não pode ser calculado por uma fórmula delta ($\Delta$) simples sem distorcer o custo médio contábil original.
- **Decisão:** Todo estorno (`movement_type = 'reversal'`) dispara **obrigatoriamente a recomputação integral** da posição a partir da repetição cronológica de todos os lançamentos daquela tupla `(account_id, asset_id)` ordenados por data de competência e criação.
- **Consequências:** Garantia absoluta de integridade matemática do custo médio ponderado mesmo após sequências complexas de compras, vendas e estornos.

---

## ADR-014: Catálogo Estrito de Ativos por Titular (Sem Catálogo Global no MVP)

- **Status:** Aprovado.
- **Contexto:** Um catálogo global compartilhado de ativos introduziria complexidade de segurança: exigiria regras de RLS assimétricas (escrita pública ou administrativa com leitura compartilhada) e permitiria inferência de existência de ativos ou tickers cadastrados por outros usuários na mesma instância.
- **Decisão:** No MVP, a collection `assets` é 100% isolada por titular (`user_id` obrigatório em todo registro com RLS uniforme `user_id = @request.auth.id`). Catálogo global e provedores externos de cotação permanecem adiados.
- **Consequências:** Regras de segurança simples e uniformes em todas as tabelas patrimoniais, sem brechas para enumeração lateral ou vazamento de dados entre titulares.

---

## ADR-015: Gestão Multi-Moeda em Consolidações Patrimoniais

- **Status:** Aprovado.
- **Contexto:** Contas em moedas distintas (ex: BRL, USD) são suportadas no modelo desde o início, mas transferências cross-currency e conversão implícita foram adiadas. Somar valores em centavos de moedas diferentes em um único montante geraria distorções patrimoniais severas.
- **Decisão:** A collection `consolidations` adota o campo `total_cents_by_currency` (objeto JSON estruturado mapeando o código da moeda para seu total em centavos, ex: `{"BRL": 15000000, "USD": 250000}`). As agregações patrimoniais preservam a segregação por moeda até que um motor formal de câmbio seja integrado.
- **Consequências:** Integridade contábil estrita para portfólios multi-moeda sem misturar grandezas financeiras incomparáveis.

---

## ADR-016: Catálogo Canônico de Códigos de Erro de Domínio

- **Status:** Aprovado.
- **Contexto:** Erros genéricos de HTTP (como 400 Bad Request) geram respostas opacas ao usuário final, impossibilitando distinção entre violação de saldo insuficiente, idempotência duplicada ou token expirado.
- **Decisão:** Toda função backend e endpoint deve retornar respostas com códigos de erro canônicos estruturados no formato `{ code: DomainErrorCode, message: string }`. A lista de códigos é padronizada e imutável no contrato da API.
- **Consequências:** O cliente frontend consegue mapear erros de negócio diretamente para mensagens compreensíveis e contextuais na interface.

---

## ADR-017: Provisionamento Manual do Administrador Inicial (Sem Criação de Usuários por Migration)

- **Status:** Aprovado (Revisado).
- **Contexto:** O sistema é _Invite-Only_ e não permite registro público. Tentativas de automatizar a criação de usuários administradores via migrations de banco geram complexidade desnecessária, dependência de segredos de ambiente na execução de schema e fazem o repositório descrever um estado de banco que não reflete a realidade operacional.
- **Decisão:**
  1. O administrador inicial é provisionado manualmente pelo proprietário da instância diretamente no painel de superusuário do PocketBase.
  2. Nenhuma migration cria, insere ou muta registros de usuários. As migrations limitam-se estritamente à definição e evolução estrutural do schema (campos, tipos, índices e regras de RLS).
  3. Uma vez criado o administrador inicial no painel de superusuário com `role='admin'` e `status='active'`, todos os demais usuários e administradores adicionais ingressam exclusivamente pelo fluxo canônico de convites (_Invite-Only_).
- **Consequências:** As migrations tornam-se puramente idempotentes e livres de efeitos colaterais. Elimina-se a necessidade de variáveis de bootstrap de administrador, simplificando a governança de ambiente e garantindo conformidade estrita entre a especificação e o banco real.

---

## ADR-019: Regras Rígidas de Execução Incremental de Migrations e Alocação de Ordinais do Domínio

- **Status:** Aprovado e Mandatório (Atualizado pela ADR-021).
- **Contexto:** Tentativas anteriores de aplicar conjuntos amplos de migrations em lote sem validação intermediária e sem guarda estrita de nomenclatura/consistência resultaram em loops de correção (dois arquivos `0001`, dois `0002`, divergência de grafia entre create e drop). Para o Lote 1 e Lote 2 da Fase 2, é imperativo fixar antecipadamente a alocação de ordinais de todas as 14 collections e instituir a regra de execução estritamente unitária e revisada.
- **Decisão:**
  1. **Revisão Obrigatória em Drafts e Movimentação Aprovada:**
     - A regra anterior ("uma por vez, confirmar no schema antes da próxima") não é executável porque não há passo de decisão entre commit e aplicação de migrations em `pocketbase/migrations/`.
     - Toda migration deve ser escrita e revisada no diretório `pocketbase/drafts/`.
     - Uma migration só é movida para `pocketbase/migrations/` após aprovação explícita.
     - A movimentação de `pocketbase/drafts/` para `pocketbase/migrations/` é o ato deliberado de aplicar.
     - **Proibição de Escrita em Lote:** É terminantemente proibido criar múltiplos arquivos `0001_*.js`, `0002_*.js`, etc., diretamente em `pocketbase/migrations/`.
     - **Regra de Parada em Falha:** Se qualquer migration falhar ou apresentar erro no apply, parar imediatamente a execução e reportar a causa raiz em vez de tentar contornar com migrations adicionais ou mutações compensatórias.
  2. **Convenção de Nomenclatura:**
     - Todo arquivo de migration deve seguir rigorosamente o padrão `NNNN_snake_case.js` (4 dígitos ordinais padronizados com zeros à esquerda, seguidos de sublinhado e descrição em minúsculas).
  3. **Guarda Automatizada de Integridade (`check:migrations`):**
     - O script `scripts/check-migrations.mjs` integra o pipeline de validação (`pnpm run verify` e CI) e valida estritamente:
       - Conformidade com o padrão `NNNN_snake_case.js`.
       - Ausência de ordinais duplicados.
       - Ausência de buracos na sequência cronológica de ordinais a partir de `0001`.
       - Consistência de drops (nenhum drop pode referenciar collection não criada em migration anterior ou nativa).
  4. **Alocação Prévia e Fixada dos Ordinais das 14 Collections:**
     - A alocação numérica é imutável e deve ser respeitada antes da criação de qualquer arquivo:
       - `0001_extend_users_and_bootstrap.js` -> `users` (extensão da auth nativa `_pb_users_auth_`)
       - `0002_create_invitations.js` -> `invitations`
       - `0003_create_audit_logs.js` -> `audit_logs`
       - `0004_create_portfolios.js` -> `portfolios` _(ordinal já fixado)_
       - `0005_create_institutions.js` -> `institutions` _(ordinal já fixado)_
       - `0006_create_accounts.js` -> `accounts`
       - `0007_create_account_balances.js` -> `account_balances`
       - `0008_create_assets.js` -> `assets`
       - `0009_create_positions.js` -> `positions`
       - `0010_create_movements.js` -> `movements`
       - `0011_create_transfers.js` -> `transfers`
       - `0012_create_quotes.js` -> `quotes`
       - `0013_create_wealth_goals.js` -> `wealth_goals`
       - `0014_create_consolidations.js` -> `consolidations`
- **Consequências:** Eliminação definitiva de ambiguidades de ordinais, garantia de rastreabilidade passo a passo do schema e prevenção absoluta de regressões e colisões no ciclo de persistência do Skip Cloud.

---

## ADR-020: Independência de Espaços entre Ordinais do Repositório e a Tabela Interna `_migrations`

- **Status:** Aprovado e Mandatório.
- **Contexto:** Durante a fase de investigação de infraestrutura, foram executadas 7 migrations de teste/canário e probes (`0001_canary_test.js` a `0007_b2_probe_cleanup.js`), registradas na tabela do sistema `_migrations` do PocketBase. Foi necessário definir se a sequência de migrations do repositório (`0001` a `0014`, fixada na ADR-019) entraria em conflito com as entradas registradas no backend.
- **Decisão:**
  1. **Espaços de Identificação Independentes:** Os ordinais do repositório (`0001` a `0014`, ADR-019) e as linhas da tabela `_migrations` do PocketBase constituem espaços de identificação independentes. A tabela `_migrations` chaveia unicamente pela coluna `file` (nome exato do arquivo, ex: `0001_extend_users_and_bootstrap.js`) e não pelo ordinal isolado (inferido, não verificado, pois a tabela `_migrations` não é legível pelas ferramentas de diagnóstico como `db_describe_object`).
  2. **Preservação do Histórico e Integridade:** As 7 entradas de canário/probe no backend permanecem intocadas como registro histórico de auditoria e desenvolvimento. Nada é apagado da tabela `_migrations`.
  3. **Vedação de Edição Manual:** Fica terminantemente vedado editar, truncar ou manipular a tabela `_migrations` manualmente (via SQL direto ou scripts ad-hoc). Toda evolução de banco é governada exclusivamente pelo fluxo canônico de migrations via ferramenta de backend (`apply_migrations`).
  4. **Referência Operacional:** Esta decisão complementa as diretrizes operacionais descritas em `docs/RESET_DEVELOPMENT.md`.
- **Consequências:** O repositório inicia seu Lote 1 canônico a partir do ordinal `0001_extend_users_and_bootstrap.js` de forma limpa, previsível e em total conformidade com a ADR-019 e a guarda `check:migrations`, enquanto o backend aplica com sucesso a nova migration sem colisão de nome de arquivo (`file`).

---

## ADR-021: Irreversibilidade de Migrations e Protocolo de Revisão em `pocketbase/drafts/`

- **Status:** Aprovado e Mandatório.
- **Contexto:** Durante o planejamento e execução da Fase 2 (Lote 2), foi identificado um conjunto crítico de achados de infraestrutura que altera fundamentalmente a avaliação de risco:
  1. Não existe ferramenta de rollback de migration em nenhum conjunto disponível (confirmado: o conjunto do agente não tem apply/revert; não há função de backend nem hook).
  2. O restore de snapshot (B2) segue não comprovado.
  3. A aplicação de migration ocorre sem gate humano.
- **Decisão:**
  - **Consequência da Irreversibilidade:** TODA migration é operação irreversível. A corretude precisa ser garantida antes do arquivo chegar em `pocketbase/migrations/`, não confirmada depois.
  - **Mecanismo de Proteção (Protocolo de Drafts):** Migrations passam a ser escritas e revisadas em `pocketbase/drafts/` e só são movidas para `pocketbase/migrations/` após aprovação explícita. A movimentação é o ato de aplicar.
  - **Atualização da ADR-019:** A regra "uma por vez, confirmar no schema antes da próxima" não é executável, porque não há passo de decisão entre commit e aplicação. Substitui-se pela regra de revisão obrigatória em `pocketbase/drafts/`.
- **Consequências:** Elimina-se o risco de aplicação prematura ou acidental de migrations irreversíveis no banco live. Nenhuma alteração de schema chega ao diretório monitorado sem validação prévia em draft e aprovação formal.
