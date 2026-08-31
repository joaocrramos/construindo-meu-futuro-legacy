# Modelo Funcional de Dados e Schema Relacional Consolidado (Fase 2)

Este documento é a **especificação formal única e definitiva da modelagem de dados** para o backend **PocketBase (SQLite)** do projeto **Construindo Meu Futuro**.

Ele consolida todas as decisões arquiteturais aprovadas (A1–A4, ADRs), correções estruturais de schema (C1–C7), formulação de custo médio e posições (D1–D3), provisionamento do administrador inicial (ADR-017 revisada), catálogo canônico de códigos de erro de domínio (F2), diretrizes backend-only (F1) e resolução de dependências e titularidade de ativos (H1–H3).

---

## 1. Estado Atual vs. Planejamento de Execução

- **Collections Atuais no Banco:** Apenas a collection nativa `users` (`_pb_users_auth_`).
- **Collections de Domínio Criadas:** **Nenhuma**. Não há tabelas adicionais provisionadas.
- **Migrations Aplicadas:** **0 migrations** aplicadas.
- **Transição de Fase:** Nenhuma collection ou migration deve ser criada fora do plano de execução em dois lotes estabelecido para a Fase 2.

---

## 2. Convenções Globais de Modelagem e Persistência

1. **Nomenclatura Técnica:** Inglês (`snake_case`) para nomes de collections, campos, índices e parâmetros.
2. **Identificadores e Chaves Estrangeiras:**
   - Sufixo `_id` para referências e foreign keys (ex: `user_id`, `account_id`, `asset_id`, `reversal_of_id`).
   - Coleção `users` interna referenciada obrigatoriamente por `_pb_users_auth_`.
3. **Representação Numérica e Precisão Fixa (Sem Float Financeiro):**
   - **Quantidades de Ativos:** Sufixo `_e8` (número inteiro escalado por 10^8, ou seja, 8 casas decimais). Magnitude máxima aprovada: $\pm 10^{15}$.
   - **Valores Monetários e Moedas:** Sufixo `_cents` (número inteiro em centavos na menor fração da moeda).
   - **Preços Unitários:** Sufixo `_cents_e4` ou `_cents` explicitado (centavos escalados para permitir precisão em cotas fracionárias).
4. **Datas e Fuso Horário de Negócio:**
   - Datas de negócio (competência, pregão, vencimento, fechamento): Formato ISO 8601 (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ss.sssZ`).
   - **Fuso Horário Canônico de Negócio:** `America/Sao_Paulo` (definido em ADR-009). Todas as fronteiras mensais de consolidação e buscas de cotação histórica (`<= basis_date`) operam sob a perspectiva deste fuso horário antes da conversão para UTC.
5. **Autodate Mandatório:** Toda collection do tipo `base` inclui explicitamente os campos `created` (`onCreate: true, onUpdate: false`) e `updated` (`onCreate: true, onUpdate: true`).
6. **Segurança de Criação (Backend-Only):**
   - Collections transacionais sensíveis (`movements`, `transfers`, `quotes`, `invitations`) possuem `createRule = ""` ou `createRule = null` bloqueado para o cliente direto e são mutadas exclusivamente via funções server-side/endpoints autenticados (`runInTransaction`).

---

## 3. Catálogo das 13 Collections de Domínio

| Ord    | Collection         | Tipo   | Titularidade / Escopo   | Objetivo Principal                                                    | Criação (createRule)       |
| :----- | :----------------- | :----- | :---------------------- | :-------------------------------------------------------------------- | :------------------------- |
| **01** | `users`            | `auth` | Sistema / Auth          | Gestão de identidade, controle de papéis (`role`) e ciclo de ativação | Admin / Bootstrap          |
| **02** | `invitations`      | `base` | Titular / Admin         | Tokens seguros de convite (_Invite-Only_) e bootstrap                 | Backend-Only               |
| **03** | `audit_logs`       | `base` | Sistema / Titular       | Trilha cronológica imutável de eventos e segurança                    | Backend-Only               |
| **04** | `portfolios`       | `base` | Por Titular (`user_id`) | Agrupamentos lógicos/estratégicos de ativos                           | Autenticado (`user_id`)    |
| **05** | `institutions`     | `base` | Por Titular (`user_id`) | Bancos, corretoras e custodiantes parceiros                           | Autenticado (`user_id`)    |
| **06** | `accounts`         | `base` | Por Titular (`user_id`) | Contas bancárias, custódia e caixas operacionais                      | Autenticado (`user_id`)    |
| **07** | `account_balances` | `base` | Por Titular (`user_id`) | Projeção transacional do saldo de caixa por conta/moeda               | Backend-Only (Inline)      |
| **08** | `assets`           | `base` | Por Titular (`user_id`) | Catálogo estrito por titular de instrumentos negociáveis              | Autenticado (`user_id`)    |
| **09** | `positions`        | `base` | Por Titular (`user_id`) | Projeção de custódia, quantidade e custo médio contábil               | Backend-Only (Inline)      |
| **10** | `movements`        | `base` | Por Titular (`user_id`) | Livro-razão contábil (compras, vendas, proventos, estornos)           | Backend-Only (`runInTx`)   |
| **11** | `transfers`        | `base` | Por Titular (`user_id`) | Transferências entre contas do mesmo titular e mesma moeda            | Backend-Only (`runInTx`)   |
| **12** | `quotes`           | `base` | Por Titular (`user_id`) | Histórico versionado de preços de mercado                             | Backend-Only               |
| **13** | `wealth_goals`     | `base` | Por Titular (`user_id`) | Metas de independência e alocação financeira                          | Autenticado (`user_id`)    |
| **14** | `consolidations`   | `base` | Por Titular (`user_id`) | Fechamentos contábeis mensais e snapshots patrimoniais                | Backend-Only / Autenticado |

---

## 4. Detalhamento Estrutural das Collections

### 4.1 `users` (auth collection)

Collection nativa de autenticação estendida com controle de papéis, bloqueio de campos sensíveis e ciclo de ativação.

- **Campos:**
  - `email`: `email` (obrigatório, único nativo)
  - `emailVisibility`: `bool` (gerenciado; **bloqueado para edição direta** via hook `protect_admin_fields` para impedir vazamento em `expand`)
  - `name`: `text` (obrigatório, min: 2, max: 150)
  - `role`: `select` `['admin', 'user']` (obrigatório, padrão: `'user'`)
  - `status`: `select` `['active', 'suspended', 'pending']` (obrigatório, padrão: `'pending'`)
  - `must_change_password`: `bool` (padrão: `false`, não-obrigatório)
  - `avatar`: `file` (opcional, maxSelect: 1, maxSize: 5MB, mimeTypes: `['image/jpeg', 'image/png', 'image/webp']`)
  - `phone`: `text` (opcional, max: 30)
  - `last_login`: `date` (opcional)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)`
  - `viewRule`: `@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)`
  - `createRule`: `@request.auth.role = 'admin'`
  - `updateRule`: `@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)`
  - `deleteRule`: `@request.auth.role = 'admin'`
- **Proteções de Hook:** O hook `protect_admin_fields` intercepta `onRecordUpdateRequest` e impede que usuários não-admin alterem `role`, `status`, `must_change_password` e `emailVisibility`.

---

### 4.2 `invitations` (base collection)

Gestão de convites criptográficos de uso único (_Invite-Only_) e bootstrap do sistema.

- **Campos:**
  - `email`: `email` (obrigatório, único por convite ativo)
  - `token_hash`: `text` (obrigatório, hash SHA-256 do segredo de ativação)
  - `token_public_id`: `text` (obrigatório, identificador público seguro para lookup em tempo constante)
  - `role`: `select` `['admin', 'user']` (obrigatório, padrão: `'user'`)
  - `status`: `select` `['pending', 'accepted', 'expired', 'revoked']` (obrigatório, padrão: `'pending'`)
  - `invited_by`: `relation` -> `_pb_users_auth_` (opcional, nulo para bootstrap gerado pelo sistema)
  - `expires_at`: `date` (obrigatório; fixo em 7 dias a partir da criação, não extensível)
  - `accepted_at`: `date` (opcional)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE UNIQUE INDEX idx_invitations_token_hash ON invitations (token_hash)`
  - `CREATE UNIQUE INDEX idx_invitations_public_id ON invitations (token_public_id)`
  - `CREATE INDEX idx_invitations_email_status ON invitations (email, status)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.role = 'admin'`
  - `viewRule`: `@request.auth.role = 'admin'`
  - `createRule`: `null` (Backend-Only via endpoint `createInvite`)
  - `updateRule`: `null` (Backend-Only via endpoint `acceptInvite` / `revokeInvite`)
  - `deleteRule`: `null` (Registros históricos não são excluídos)

---

### 4.3 `audit_logs` (base collection)

Trilha de auditoria contínua e imutável para eventos de segurança e operações de negócio críticas.

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (opcional, nulo para eventos anônimos ou sistema)
  - `event_type`: `text` (obrigatório, ex: `AUTH_LOGIN`, `AUTH_LOGOUT`, `PASSWORD_RESET_REQ`, `ADMIN_ACTIVATED`, `INVITE_CREATED`, `MOVEMENT_CREATED`, `MOVEMENT_REVERSED`, `AUDIT_PURGE_RUN`)
  - `severity`: `select` `['info', 'warn', 'critical']` (obrigatório, padrão: `'info'`)
  - `ip_address`: `text` (opcional, devidamente anonimizado/mascarado)
  - `user_agent`: `text` (opcional, truncado em 255 caracteres)
  - `entity`: `text` (opcional, ex: `users`, `movements`, `accounts`)
  - `entity_id`: `text` (opcional)
  - `summary`: `text` (obrigatório, max: 500 caracteres, proibido credenciais ou tokens em texto claro)
  - `details`: `json` (opcional, metadados complementares)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created DESC)`
  - `CREATE INDEX idx_audit_logs_type_created ON audit_logs (event_type, created DESC)`
  - `CREATE INDEX idx_audit_logs_retention ON audit_logs (created)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.role = 'admin'`
  - `viewRule`: `@request.auth.role = 'admin'`
  - `createRule`: `null` (Backend-Only gerado por hooks ou funções)
  - `updateRule`: `null` (Imutabilidade estrita)
  - `deleteRule`: `null` (Imutabilidade estrita; purgas somente via job agendado direto no SQL)
- **Política de Retenção Aprovada:** 365 dias para logs operacionais gerais. Eventos de purga (`AUDIT_PURGE_RUN`) retidos por 7 anos.

---

### 4.4 `portfolios` (base collection)

Agrupamentos lógicos e conceituais de patrimônio (ex: "Reserva de Emergência", "Aposentadoria", "Projetos Imobiliários").

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `name`: `text` (obrigatório, min: 1, max: 100)
  - `description`: `text` (opcional, max: 500)
  - `color`: `text` (opcional, formato hex `#RRGGBB`)
  - `is_archived`: `bool` (padrão: `false`)
  - `target_amount_cents`: `number` (opcional, onlyInt: true, min: 0)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE INDEX idx_portfolios_user_archived ON portfolios (user_id, is_archived)`
  - `CREATE UNIQUE INDEX idx_portfolios_user_name ON portfolios (user_id, name)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `@request.auth.id != '' && @request.body.user_id = @request.auth.id`
  - `updateRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `deleteRule`: `@request.auth.id != '' && user_id = @request.auth.id`

---

### 4.5 `institutions` (base collection)

Instituições financeiras, corretoras, bancos e exchanges parceiras.

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `name`: `text` (obrigatório, min: 1, max: 100)
  - `code`: `text` (opcional, código ISPB ou COMPE)
  - `institution_type`: `select` `['bank', 'broker', 'crypto_exchange', 'international', 'other']` (obrigatório, padrão: `'bank'`)
  - `website`: `url` (opcional)
  - `is_active`: `bool` (padrão: `true`)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE INDEX idx_institutions_user_active ON institutions (user_id, is_active)`
  - `CREATE UNIQUE INDEX idx_institutions_user_name ON institutions (user_id, name)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `@request.auth.id != '' && @request.body.user_id = @request.auth.id`
  - `updateRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `deleteRule`: `@request.auth.id != '' && user_id = @request.auth.id`

---

### 4.6 `accounts` (base collection)

Contas correntes, contas de custódia e caixas de liquidação.

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `institution_id`: `relation` -> `institutions` (obrigatório)
  - `name`: `text` (obrigatório, min: 1, max: 100)
  - `account_type`: `select` `['checking', 'investment', 'savings', 'international_checking', 'cash', 'other']` (obrigatório, padrão: `'checking'`)
  - `currency`: `text` (obrigatório, padrão: `'BRL'`, min: 3, max: 3)
  - `account_number`: `text` (opcional)
  - `agency`: `text` (opcional)
  - `is_active`: `bool` (padrão: `true`)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE INDEX idx_accounts_user_institution ON accounts (user_id, institution_id)`
  - `CREATE INDEX idx_accounts_user_active ON accounts (user_id, is_active)`
  - `CREATE UNIQUE INDEX idx_accounts_user_name ON accounts (user_id, name)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `@request.auth.id != '' && @request.body.user_id = @request.auth.id`
  - `updateRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `deleteRule`: `@request.auth.id != '' && user_id = @request.auth.id`

---

### 4.7 `account_balances` (base collection) — Projeção de Caixa (C6)

Entidade formal de projeção de saldo de caixa, mantida sincronamente e de forma transacional pelas rotinas financeiras.

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `account_id`: `relation` -> `accounts` (obrigatório, cascadeDelete: true)
  - `currency`: `text` (obrigatório, min: 3, max: 3, padrão: `'BRL'`)
  - `balance_cents`: `number` (obrigatório, onlyInt: true, padrão: `0` — saldo líquido em centavos)
  - `last_movement_id`: `relation` -> `movements` (opcional, rastreio do último lançamento aplicado)
  - `last_recalculated_at`: `date` (obrigatório)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE UNIQUE INDEX idx_account_balances_user_acc_curr ON account_balances (user_id, account_id, currency)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `null` (Projeção atualizada exclusivamente pelo backend)
  - `updateRule`: `null` (Projeção atualizada exclusivamente pelo backend)
  - `deleteRule`: `null`

---

### 4.8 `assets` (base collection) — Catálogo Estrito por Titular (H1)

Instrumentos e ativos financeiros. **Decidido formalmente:** 100% isolado por titular (`user_id` obrigatório); catálogo global compartilhado está descartado do MVP.

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `ticker`: `text` (obrigatório, min: 1, max: 30)
  - `name`: `text` (obrigatório, min: 1, max: 150)
  - `asset_class`: `select` `['fixed_income', 'equities', 'real_estate_funds', 'mutual_funds', 'crypto', 'cash_equivalent', 'other']` (obrigatório)
  - `sub_type`: `text` (opcional, ex: "CDB", "LCI", "Ação PN", "FII Tijolo")
  - `currency`: `text` (obrigatório, padrão: `'BRL'`, min: 3, max: 3)
  - `cnpj_issuer`: `text` (opcional, max: 18)
  - `is_active`: `bool` (padrão: `true`)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE UNIQUE INDEX idx_assets_user_ticker ON assets (user_id, ticker)`
  - `CREATE INDEX idx_assets_user_class ON assets (user_id, asset_class)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `@request.auth.id != '' && @request.body.user_id = @request.auth.id`
  - `updateRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `deleteRule`: `@request.auth.id != '' && user_id = @request.auth.id`

---

### 4.9 `positions` (base collection) — Custódia e Custo Médio (D1–D3, H2, H3)

Projeção materializada da quantidade de ativos e do custo médio contábil em custódia por conta e ativo.

- **Dependências Corrigidas (H2):** Relaciona-se com `account_id` e `asset_id`. **Não possui `portfolio_id`** (agregação de carteira é calculada nas consultas ou consolidada por visualização).
- **Vencimento como Atributo de Posição (H3):** `maturity_date` reside na posição porque o vencimento é a liquidação da custódia do lote naquela conta específica.
- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `account_id`: `relation` -> `accounts` (obrigatório, cascadeDelete: true)
  - `asset_id`: `relation` -> `assets` (obrigatório)
  - `quantity_e8`: `number` (obrigatório, onlyInt: true, padrão: `0`, magnitude max: $\pm 10^{15}$)
  - `average_price_cents`: `number` (obrigatório, onlyInt: true, padrão: `0`, custo médio contábil unitário em centavos)
  - `total_cost_cents`: `number` (obrigatório, onlyInt: true, padrão: `0`, custo total contábil acumulado)
  - `current_price_cents`: `number` (opcional, onlyInt: true, última cotação conhecida de mercado)
  - `total_market_value_cents`: `number` (opcional, onlyInt: true, valor a mercado projetado)
  - `maturity_date`: `date` (opcional, prazo de vencimento do título em custódia)
  - `indexer`: `text` (opcional, ex: "100% CDI", "IPCA + 6.5%", "Pré 12%")
  - `notes`: `text` (opcional)
  - `last_recalculated_at`: `date` (obrigatório)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE UNIQUE INDEX idx_positions_user_acc_asset ON positions (user_id, account_id, asset_id)`
  - `CREATE INDEX idx_positions_user_maturity ON positions (user_id, maturity_date)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `null` (Atualização síncrona/inline exclusiva do backend em `createMovement`)
  - `updateRule`: `null` (Atualização síncrona/inline exclusiva do backend)
  - `deleteRule`: `null`

---

### 4.10 `movements` (base collection) — Livro-Razão Contábil (C2, C3, D1, D2, F1, H2)

Registro atômico, imutável e auditável de todas as movimentações financeiras de ativos e caixa.

- **Dependências Corrigidas (H2):** Relaciona-se com `account_id` e `asset_id` (opcional para caixa puro). Não possui `portfolio_id`.
- **Aritmética e Fórmulas Invariantes:**
  - $net\_amount\_cents = gross\_amount\_cents - fees\_cents - taxes\_cents$
  - Sinais explícitos e consistentes: entradas em caixa (proventos, vendas líquidas, depósitos) possuem $net > 0$; saídas de caixa (compras brutas + taxas, retiradas) possuem $net < 0$.
- **Idempotência por Usuário (C2):** `(user_id, idempotency_key)` com escopo estrito por titular.
- **Prevenção de Estorno Duplo (C3):** `reversal_of_id` único quando `movement_type = 'reversal'`.
- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `account_id`: `relation` -> `accounts` (obrigatório)
  - `asset_id`: `relation` -> `assets` (opcional; obrigatório para `buy`, `sell`, `split`, `grouping`, `amortization`)
  - `movement_type`: `select` `['deposit', 'withdrawal', 'buy', 'sell', 'dividend', 'interest_on_capital', 'amortization', 'fee', 'tax', 'reversal']` (obrigatório)
  - `date`: `date` (obrigatório, data de competência da operação)
  - `quantity_e8`: `number` (opcional, onlyInt: true, padrão: `0`, magnitude max: $\pm 10^{15}$)
  - `unit_price_cents`: `number` (opcional, onlyInt: true, padrão: `0`)
  - `gross_amount_cents`: `number` (obrigatório, onlyInt: true)
  - `fees_cents`: `number` (obrigatório, onlyInt: true, min: 0, padrão: `0`)
  - `taxes_cents`: `number` (obrigatório, onlyInt: true, min: 0, padrão: `0`)
  - `net_amount_cents`: `number` (obrigatório, onlyInt: true)
  - `idempotency_key`: `text` (opcional, chave do cliente para deduplicação)
  - `reversal_of_id`: `relation` -> `movements` (opcional, aponta para o movimento original estornado)
  - `is_reversed`: `bool` (padrão: `false`, marcado como `true` quando sofre estorno)
  - `notes`: `text` (opcional)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE INDEX idx_movements_user_acc_date ON movements (user_id, account_id, date DESC)`
  - `CREATE INDEX idx_movements_user_asset_date ON movements (user_id, asset_id, date DESC)`
  - `CREATE UNIQUE INDEX idx_movements_user_idempotency ON movements (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key != ''`
  - `CREATE UNIQUE INDEX idx_movements_reversal_unique ON movements (reversal_of_id) WHERE movement_type = 'reversal' AND reversal_of_id IS NOT NULL`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `null` (Backend-Only via endpoint `createMovement` com `$app.runInTransaction`)
  - `updateRule`: `null` (Imutabilidade contábil estrita)
  - `deleteRule`: `null` (Exclusão proibida; correções somente via estorno `reversal`)

---

### 4.11 `transfers` (base collection) — Mesma Titularidade e Moeda (A4, C2, F1)

Transferências internas de numerário entre contas do mesmo titular.

- **Regra de Negócio (A4):** Restrito a `from_account` e `to_account` do **mesmo titular** e **mesma moeda**. Câmbio e transferências cross-currency permanecem adiados.
- **Idempotência (C2):** Índice único em `(user_id, idempotency_key)`.
- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `from_account_id`: `relation` -> `accounts` (obrigatório)
  - `to_account_id`: `relation` -> `accounts` (obrigatório)
  - `amount_cents`: `number` (obrigatório, onlyInt: true, min: 1)
  - `date`: `date` (obrigatório)
  - `fee_cents`: `number` (obrigatório, onlyInt: true, min: 0, padrão: `0`)
  - `currency`: `text` (obrigatório, min: 3, max: 3, padrão: `'BRL'`)
  - `idempotency_key`: `text` (opcional)
  - `description`: `text` (opcional)
  - `outflow_movement_id`: `relation` -> `movements` (opcional, referência do débito)
  - `inflow_movement_id`: `relation` -> `movements` (opcional, referência do crédito)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE INDEX idx_transfers_user_date ON transfers (user_id, date DESC)`
  - `CREATE UNIQUE INDEX idx_transfers_user_idempotency ON transfers (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key != ''`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `null` (Backend-Only via endpoint `createTransfer` com `$app.runInTransaction`)
  - `updateRule`: `null` (Imutabilidade estrita)
  - `deleteRule`: `null`

---

### 4.12 `quotes` (base collection) — Versionamento e Supersedência (F1)

Histórico de preços de fechamento com versionamento explícito `(asset_id, quote_date, version)` e `supersedes_id`.

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `asset_id`: `relation` -> `assets` (obrigatório)
  - `quote_date`: `date` (obrigatório, data do pregão/referência)
  - `price_cents`: `number` (obrigatório, onlyInt: true, min: 0)
  - `currency`: `text` (obrigatório, min: 3, max: 3, padrão: `'BRL'`)
  - `source`: `select` `['manual', 'import', 'system']` (obrigatório, padrão: `'manual'`)
  - `version`: `number` (obrigatório, onlyInt: true, min: 1, padrão: `1`)
  - `supersedes_id`: `relation` -> `quotes` (opcional, aponta para a cotação retificada)
  - `is_current`: `bool` (padrão: `true`)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE UNIQUE INDEX idx_quotes_asset_date_version ON quotes (asset_id, quote_date, version)`
  - `CREATE INDEX idx_quotes_asset_date_current ON quotes (asset_id, quote_date DESC, is_current)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `null` (Backend-Only via endpoint `createQuote`)
  - `updateRule`: `null` (Imutabilidade versionada)
  - `deleteRule`: `null`

---

### 4.13 `wealth_goals` (base collection)

Metas de patrimônio, reserva e marcos de independência financeira.

- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `title`: `text` (obrigatório, min: 1, max: 100)
  - `target_amount_cents`: `number` (obrigatório, onlyInt: true, min: 1)
  - `current_amount_cents`: `number` (obrigatório, onlyInt: true, padrão: `0`)
  - `target_date`: `date` (opcional)
  - `priority`: `select` `['low', 'medium', 'high']` (obrigatório, padrão: `'medium'`)
  - `status`: `select` `['in_progress', 'completed', 'paused', 'cancelled']` (obrigatório, padrão: `'in_progress'`)
  - `linked_portfolios`: `relation` -> `portfolios` (maxSelect: 10, opcional)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE INDEX idx_goals_user_status ON wealth_goals (user_id, status)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `@request.auth.id != '' && @request.body.user_id = @request.auth.id`
  - `updateRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `deleteRule`: `@request.auth.id != '' && user_id = @request.auth.id`

---

### 4.14 `consolidations` (base collection) — Fechamento Multi-Moeda e Chave Corrigida (C1, C4, C5)

Fotografias periódicas e fechamentos mensais de patrimônio.

- **Correção da Chave e N-Correções (C1):** Chave única definida em `(user_id, basis_date, coalesce(portfolio_id, 'GLOBAL'), origin, version)` permitindo consolidações por carteira ou gerais e retificações versionadas ($N$ correções).
- **Fuso de Negócio (C4):** `basis_date` interpretada formalmente sob o fuso `America/Sao_Paulo`.
- **Tratamento Multi-Moeda (C5):** Estrutura `by_currency` em JSON detalhando saldos segregados por moeda sem conversão implícita.
- **Campos:**
  - `user_id`: `relation` -> `_pb_users_auth_` (obrigatório, cascadeDelete: true)
  - `portfolio_id`: `relation` -> `portfolios` (opcional; nulo = consolidação geral do titular)
  - `basis_date`: `date` (obrigatório, data-base do fechamento, ex: `2026-08-31`)
  - `origin`: `select` `['monthly_close', 'manual_adjustment', 'rebalance_checkpoint']` (obrigatório, padrão: `'monthly_close'`)
  - `version`: `number` (obrigatório, onlyInt: true, min: 1, padrão: `1`)
  - `total_cents_by_currency`: `json` (obrigatório, mapa com totais segregados por moeda, ex: `{"BRL": 15000000, "USD": 250000}`)
  - `total_cost_cents`: `number` (obrigatório, onlyInt: true)
  - `total_market_value_cents`: `number` (obrigatório, onlyInt: true)
  - `summary_by_class`: `json` (distribuição por classe de ativo)
  - `summary_by_institution`: `json` (distribuição por instituição)
  - `notes`: `text` (opcional)
  - `created`: `autodate` (onCreate)
  - `updated`: `autodate` (onCreate, onUpdate)
- **Índices:**
  - `CREATE UNIQUE INDEX idx_consolidations_unique ON consolidations (user_id, basis_date, portfolio_id, origin, version)`
- **Regras de API (RLS):**
  - `listRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `viewRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `createRule`: `@request.auth.id != '' && @request.body.user_id = @request.auth.id`
  - `updateRule`: `@request.auth.id != '' && user_id = @request.auth.id`
  - `deleteRule`: `@request.auth.id != '' && user_id = @request.auth.id`

---

## 5. Regras de Negócio de Custo Médio e Posições (D1–D3)

### 5.1 Não-Invertibilidade Contábil por Delta (D1)

Uma operação de venda reduz a quantidade mantendo o custo médio inalterado, descartando a informação histórica do custo de aquisição. Estornar uma venda não pode ser feito por delta ($\Delta$).

- **Regra:** Todo estorno (`movement_type = 'reversal'`) dispara **obrigatoriamente a recomputação integral** da posição a partir do replay de todos os movimentos daquela tupla `(account_id, asset_id)` ordenados por `date ASC, created ASC`.

### 5.2 Atualização Inline dentro de `$app.runInTransaction` (D2)

Proibi-se categoricamente o uso de hooks `onRecordAfter*Success` para atualização de posições e saldos.

- **Regra:** O endpoint `createMovement` executa a validação, a gravação do registro em `movements`, a atualização do `account_balances` e a atualização do `positions` de forma atômica e inline dentro do mesmo bloco `$app.runInTransaction`. Qualquer falha aborta todas as mutações.

### 5.3 `recalculatePositions` como Função de Primeira Classe (D3)

Rotina pública no módulo de domínio e endpoint seguro de manutenção. Reexecuta o motor de cálculo sobre o histórico e afere paridade absoluta contra a posição materializada.

---

## 6. Fluxo e Provisionamento do Administrador Inicial (ADR-017 Revisada)

1. **Provisionamento Manual:** O primeiro usuário administrador é provisionado manualmente pelo proprietário da instância diretamente no painel de superusuário do PocketBase, com `role='admin'` e `status='active'`. Nenhuma migration cria usuários.
2. **Convites e Expansão:** Uma vez ativo, o administrador cria novos usuários e administradores adicionais exclusivamente via emissão de convites na collection `invitations` (_Invite-Only_).
3. **Anti-Enumeração e Rate Limiting:** Resposta HTTP e tempo idênticos para e-mails cadastrados e não-cadastrados, com limitação estrita de taxa (Rate Limit).
4. **Primitivo Único de Token:** Sistema baseado em `(token_public_id, token_hash)` com comparação em tempo constante (`crypto/subtle` ou `$security.sha256`) para convites e recuperação de conta.
5. **Fallback de Desenvolvimento:** Se o provedor de e-mail (Resend) não estiver provisionado em ambiente local/desenvolvimento, o endpoint expõe o link seguro nos logs do console do backend.
6. **Consolidação de Telas Públicas:**
   - `/forgot-password`: Solicitação pública com e-mail para redefinição de senha.
   - `/first-access`: Consumo de token de convite e definição da senha definitiva.

---

## 7. Catálogo Canônico de Códigos de Erro de Domínio (F2)

Toda rejeição por regra de negócio em endpoints e funções backend retorna a estrutura estável `{ code: DomainErrorCode, message: string }`:

```typescript
export const DOMAIN_ERROR_CODES = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NEGATIVE_POSITION: 'NEGATIVE_POSITION',
  DUPLICATE_IDEMPOTENCY_KEY: 'DUPLICATE_IDEMPOTENCY_KEY',
  DUPLICATE_REVERSAL: 'DUPLICATE_REVERSAL',
  CANNOT_REVERSE_REVERSAL: 'CANNOT_REVERSE_REVERSAL',
  INVITE_EXPIRED: 'INVITE_EXPIRED',
  INVITE_ALREADY_USED: 'INVITE_ALREADY_USED',
  INVITE_REVOKED: 'INVITE_REVOKED',
  INVITE_INVALID_TOKEN: 'INVITE_INVALID_TOKEN',
  ACCOUNT_NOT_OWNED: 'ACCOUNT_NOT_OWNED',
  ASSET_NOT_OWNED: 'ASSET_NOT_OWNED',
  PORTFOLIO_NOT_OWNED: 'PORTFOLIO_NOT_OWNED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  IMMUTABLE_RECORD: 'IMMUTABLE_RECORD',
  NET_AMOUNT_MISMATCH: 'NET_AMOUNT_MISMATCH',
  CROSS_CURRENCY_NOT_SUPPORTED: 'CROSS_CURRENCY_NOT_SUPPORTED',
  DIFFERENT_ACCOUNT_HOLDERS: 'DIFFERENT_ACCOUNT_HOLDERS',
  RATE_LIMITED: 'RATE_LIMITED',
  ADMIN_ACTIVATION_ALREADY_USED: 'ADMIN_ACTIVATION_ALREADY_USED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type DomainErrorCode = keyof typeof DOMAIN_ERROR_CODES
```

---

## 8. Regras Arquiteturais de Desacoplamento (F3a, F3b)

1. **ADR-010 (F3a — Isolamento do SDK):** Nenhuma página (`src/pages/**`) pode importar o cliente do PocketBase (`import pb from '@/lib/pocketbase/client'`). O acesso a dados ocorre exclusivamente por módulos em `src/lib/data/<recurso>.ts`.
2. **ADR-011 (F3b — Domínio Puro e Portabilidade):** A lógica de cálculo contábil (custo médio, fórmulas de net/gross, validações de saldo) é implementada como **funções puras em TypeScript** em `src/domain/wealth/*`. Os hooks e endpoints do PocketBase atuam estritamente como adaptadores I/O. Isso permite execução ultrarrápida da suíte de aritmética via Vitest sem dependência de banco de dados ativo.
