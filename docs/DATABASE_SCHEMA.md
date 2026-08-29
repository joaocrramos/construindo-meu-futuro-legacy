# Modelo Funcional de Dados e Schema Planejado

Este documento descreve o modelo relacional planejado para persistência no **PocketBase (SQLite)**, cobrindo todas as entidades de domínio, campos, tipos, regras de acesso (RLS) e índices.

> **Importante:** Por decisão de escopo da Fundação MVP, nenhuma migration foi aplicada ao banco de dados nesta etapa. O schema a seguir orienta as migrations da Fase 2.

---

## 1. Mapeamento de Collections

| Collection         | Tipo | Objetivo Principal                                      | RLS (Leitura / Escrita)                 |
| ------------------ | ---- | ------------------------------------------------------- | --------------------------------------- |
| `users`            | auth | Usuários do sistema, papéis e dados de auth             | Dono ou Admin                           |
| `invitations`      | base | Controle de tokens de convite de acesso (_Invite-Only_) | Admin cria/lista; Token público no view |
| `audit_logs`       | base | Trilha cronológica e imutável de segurança              | Somente Admin / Sistema                 |
| `portfolios`       | base | Carteiras / agrupamentos estratégicos de ativos         | `@request.auth.id = user_id`            |
| `institutions`     | base | Bancos, corretoras e custodiantes parceiros             | `@request.auth.id = user_id`            |
| `accounts`         | base | Contas bancárias e contas de investimento               | `@request.auth.id = user_id`            |
| `asset_categories` | base | Categorias de ativos (Renda Fixa, Ações, FIIs, etc.)    | `@request.auth.id = user_id` ou Global  |
| `assets`           | base | Catálogo de instrumentos e produtos financeiros         | `@request.auth.id = user_id` ou Global  |
| `positions`        | base | Quantidade e custo médio em custódia                    | `@request.auth.id = user_id`            |
| `movements`        | base | Aportes, compras, vendas e proventos                    | `@request.auth.id = user_id`            |
| `transfers`        | base | Transferências entre contas do titular                  | `@request.auth.id = user_id`            |
| `quotes`           | base | Preços históricos de fechamento de mercado              | Leitura autenticada / Admin             |
| `maturities`       | base | Agendamento de resgates e vencimentos de títulos        | `@request.auth.id = user_id`            |
| `wealth_goals`     | base | Metas patrimoniais e de independência                   | `@request.auth.id = user_id`            |
| `consolidations`   | base | Fechamentos mensais consolidados do titular             | `@request.auth.id = user_id`            |

---

## 2. Detalhamento dos Schemas

### 2.1 `users` (auth collection)

- `email`: email (obrigatório, único)
- `name`: text (obrigatório)
- `role`: select `['admin', 'user']` (padrão: `'user'`)
- `status`: select `['active', 'suspended', 'pending']` (padrão: `'active'`)
- `avatar`: file (opcional)
- `phone`: text (opcional)
- `must_change_password`: bool (padrão: `false`)
- `last_login`: date (opcional)
- `created`: autodate
- `updated`: autodate

### 2.2 `invitations` (base collection)

- `email`: email (obrigatório, único)
- `token`: text (obrigatório, único, índice único)
- `status`: select `['pending', 'accepted', 'expired', 'revoked']` (padrão: `'pending'`)
- `invited_by`: relation -> `users` (obrigatório)
- `expires_at`: date (obrigatório, 7 dias a partir da criação)
- `accepted_at`: date (opcional)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:**
  - `listRule`: `@request.auth.role = 'admin'`
  - `viewRule`: `@request.auth.role = 'admin' || token = @request.query.token`
  - `createRule`: `@request.auth.role = 'admin'`
  - `updateRule`: `@request.auth.role = 'admin' || token = @request.query.token`
  - `deleteRule`: `@request.auth.role = 'admin'`

### 2.3 `audit_logs` (base collection)

- `user_id`: relation -> `users` (opcional, nulo para eventos anônimos)
- `event_type`: text (obrigatório, ex: `AUTH_LOGIN`, `INVITE_CREATE`, `PASSWORD_RESET`, `SECURITY_BLOCK`)
- `severity`: select `['info', 'warn', 'critical']` (padrão: `'info'`)
- `ip_address`: text (mascarado para privacidade)
- `user_agent`: text (opcional)
- `entity`: text (opcional, ex: `invitations`, `users`)
- `entity_id`: text (opcional)
- `summary`: text (obrigatório, resumo seguro sem expor credenciais)
- `details`: json (opcional, metadados não sensíveis)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:**
  - `listRule`: `@request.auth.role = 'admin'`
  - `viewRule`: `@request.auth.role = 'admin'`
  - `createRule`: `@request.auth.id != ''` (ou via backend hooks)
  - `updateRule`: `null` (Imutável)
  - `deleteRule`: `null` (Imutável)

### 2.4 `portfolios` (base collection)

- `user_id`: relation -> `users` (obrigatório, cascadeDelete: true)
- `name`: text (obrigatório, ex: "Reserva de Emergência", "Aposentadoria")
- `description`: text (opcional)
- `color`: text (opcional, hex da tag visual)
- `is_archived`: bool (padrão: false)
- `target_amount`: number (opcional)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

### 2.5 `institutions` (base collection)

- `user_id`: relation -> `users` (obrigatório)
- `name`: text (obrigatório, ex: "Itaú Unibanco", "XP Investimentos", "BTG Pactual")
- `code`: text (opcional, código COMPE bancário)
- `institution_type`: select `['bank', 'broker', 'crypto_exchange', 'international', 'other']`
- `website`: text (opcional)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

### 2.6 `accounts` (base collection)

- `user_id`: relation -> `users` (obrigatório)
- `institution_id`: relation -> `institutions` (obrigatório)
- `name`: text (obrigatório, ex: "Conta Corrente Principal", "Conta Custódia Ações")
- `account_type`: select `['checking', 'investment', 'savings', 'international_checking', 'other']`
- `currency`: text (padrão: `'BRL'`)
- `current_balance`: number (padrão: 0)
- `account_number`: text (opcional)
- `agency`: text (opcional)
- `is_active`: bool (padrão: true)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

### 2.7 `assets` (base collection)

- `user_id`: relation -> `users` (opcional — nulo para ativos globais do catálogo)
- `ticker`: text (obrigatório, ex: "PETR4", "HGLG11", "TESOURO_SELIC_2029")
- `name`: text (obrigatório, ex: "Petrobras PN", "CSHG Logística FII")
- `asset_class`: select `['fixed_income', 'equities', 'real_estate_funds', 'mutual_funds', 'crypto', 'real_estate', 'cash', 'other']`
- `sub_type`: text (ex: "CDB", "LCI", "Ação Ordinária", "FII Tijolo")
- `currency`: text (padrão: `'BRL'`)
- `cnpj_issuer`: text (opcional)
- `is_active`: bool (padrão: true)
- `created`: autodate
- `updated`: autodate

### 2.8 `positions` (base collection)

- `user_id`: relation -> `users` (obrigatório)
- `portfolio_id`: relation -> `portfolios` (obrigatório)
- `account_id`: relation -> `accounts` (obrigatório)
- `asset_id`: relation -> `assets` (obrigatório)
- `quantity`: number (obrigatório, casas decimais suportadas)
- `average_price`: number (obrigatório, preço médio de aquisição)
- `current_price`: number (opcional, último preço ou marcação a mercado)
- `total_cost`: number (obrigatório, quantity \* average_price)
- `total_market_value`: number (opcional, quantity \* current_price)
- `maturity_date`: date (opcional, para títulos com prazo de vencimento)
- `indexer`: text (opcional, ex: "100% CDI", "IPCA + 6.2%", "Pré 12.5%")
- `notes`: text (opcional)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

### 2.9 `movements` (base collection)

- `user_id`: relation -> `users` (obrigatório)
- `portfolio_id`: relation -> `portfolios` (obrigatório)
- `account_id`: relation -> `accounts` (obrigatório)
- `asset_id`: relation -> `assets` (opcional, para aportes/resgates puros de caixa)
- `type`: select `['deposit', 'withdrawal', 'buy', 'sell', 'dividend', 'interest_on_capital', 'amortization', 'fee', 'tax']`
- `date`: date (obrigatório, data da operação)
- `quantity`: number (opcional)
- `unit_price`: number (opcional)
- `gross_amount`: number (obrigatório, valor bruto)
- `taxes`: number (padrão: 0, IR retido / IOF)
- `fees`: number (padrão: 0, corretagem / emolumentos)
- `net_amount`: number (obrigatório, valor líquido)
- `notes`: text (opcional)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

### 2.10 `transfers` (base collection)

- `user_id`: relation -> `users` (obrigatório)
- `from_account_id`: relation -> `accounts` (obrigatório)
- `to_account_id`: relation -> `accounts` (obrigatório)
- `amount`: number (obrigatório)
- `date`: date (obrigatório)
- `fee`: number (padrão: 0)
- `exchange_rate`: number (opcional, para transferências multi-moeda)
- `description`: text (opcional)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

### 2.11 `wealth_goals` (base collection)

- `user_id`: relation -> `users` (obrigatório)
- `title`: text (obrigatório, ex: "Independência Financeira", "Compra de Imóvel")
- `target_amount`: number (obrigatório)
- `current_amount`: number (padrão: 0)
- `target_date`: date (opcional)
- `priority`: select `['low', 'medium', 'high']` (padrão: `'medium'`)
- `status`: select `['in_progress', 'completed', 'paused', 'cancelled']`
- `linked_portfolios`: relation -> `portfolios` (maxSelect > 1, opcional)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

### 2.12 `consolidations` (base collection)

- `user_id`: relation -> `users` (obrigatório)
- `reference_month`: text (obrigatório, formato "YYYY-MM")
- `total_gross_wealth`: number (obrigatório)
- `total_net_wealth`: number (obrigatório)
- `monthly_invested_amount`: number (padrão: 0)
- `monthly_profitability_percent`: number (opcional)
- `inflation_ipca_percent`: number (opcional)
- `cdi_benchmark_percent`: number (opcional)
- `summary_by_class`: json (distribuição consolidada daquele mês)
- `created`: autodate
- `updated`: autodate
- **Regras RLS:** `@request.auth.id != '' && user_id = @request.auth.id`

---

## 3. Índices Estratégicos Recomendados (SQLite)

- `CREATE UNIQUE INDEX idx_invitations_token ON invitations (token)`
- `CREATE INDEX idx_invitations_email ON invitations (email)`
- `CREATE INDEX idx_audit_logs_user_date ON audit_logs (user_id, created DESC)`
- `CREATE INDEX idx_positions_user_asset ON positions (user_id, asset_id)`
- `CREATE INDEX idx_movements_user_date ON movements (user_id, date DESC)`
- `CREATE UNIQUE INDEX idx_consolidations_user_month ON consolidations (user_id, reference_month)`
