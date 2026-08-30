# Planejamento e Sequência de Migrations do PocketBase (Fase 2)

Este diretório destina-se a armazenar as migrations JavaScript do PocketBase (JSVM) para evolução do banco de dados do **Construindo Meu Futuro**.

> **Aviso Crítico de Estado:**
> - **NÃO há migrations implementadas ou aplicadas no projeto no momento.**
> - A execução ocorrerá estritamente em **dois lotes controlados** na Fase 2.
> - A lista abaixo constitui a **especificação formal da ordem de dependências e tabelas** após a revisão arquitetural consolidada em `docs/DATABASE_SCHEMA.md`.

---

## 1. Sequência Canônica de Migrations (Planejamento por Lotes)

```
pocketbase/migrations/
├── LOTE 1 (Acesso, Identidade e Núcleo Contábil) — Conforme ADR-019
│   ├── 0001_extend_users_and_bootstrap.js   # Extensão da auth users, role, status e registro pendente do admin
│   ├── 0002_create_invitations.js          # Criação da collection invitations (role, token_hash, token_public_id)
│   ├── 0003_create_audit_logs.js           # Criação da collection audit_logs com retenção de 365 dias / 7 anos
│   ├── 0004_create_portfolios.js           # Agrupamentos patrimoniais com RLS por user_id (ordinal fixado)
│   ├── 0005_create_institutions.js         # Instituições financeiras e custodiantes (ordinal fixado)
│   ├── 0006_create_accounts.js             # Contas bancárias e domicílios de investimento
│   ├── 0007_create_account_balances.js     # Projeção transacional de saldo de caixa por conta e moeda
│   ├── 0008_create_assets.js               # Catálogo de ativos 100% por titular (user_id obrigatório)
│   ├── 0009_create_positions.js            # Posições de custódia e custo médio ponderado
│   └── 0010_create_movements.js            # Livro-razão contábil com runInTransaction
│
├── LOTE 2 (Transferências, Cotações, Metas e Consolidação) — Conforme ADR-019
│   ├── 0011_create_transfers.js            # Transferências entre contas do mesmo titular e mesma moeda
│   ├── 0012_create_quotes.js               # Histórico versionado de cotações com supersedência
│   ├── 0013_create_wealth_goals.js         # Metas financeiras e de independência
│   └── 0014_create_consolidations.js       # Fechamentos mensais multi-moeda e consolidações por carteira
│
└── README.md                               # Este arquivo de documentação e planejamento
```

---

## 2. Dependências e Ordem de Execução

1. **`users` -> `invitations` / `audit_logs`:** Infraestrutura base de segurança e autorização.
2. **`users` -> `portfolios`, `institutions` -> `accounts`:** Estrutura patrimonial e domicílios bancários.
3. **`accounts` -> `account_balances`:** Projeção atômica de saldos em moeda.
4. **`users` -> `assets`:** Catálogo de instrumentos isolado por titular (`user_id`).
5. **`accounts` + `assets` -> `positions` e `movements`:** Núcleo contábil de custódia e livro-razão.
   - *Nota de Correção (H2):* `positions` e `movements` dependem estritamente de `accounts` e `assets`. Não dependem de `portfolios`.
6. **`accounts` + `movements` -> `transfers`:** Transferências internas com geração de lançamentos de débito e crédito.
7. **`assets` -> `quotes`:** Cotações históricas vinculadas a ativos.
8. **`portfolios` -> `wealth_goals`:** Metas com vínculos opcionais a carteiras.
9. **`portfolios` + `movements` + `positions` -> `consolidations`:** Snapshots consolidados por competência mensal e multi-moeda.

---

## 3. Diretrizes Rígidas de Implementação

1. **Sem Senhas ou Segredos no Código:** Migrations nunca devem conter senhas fixas, tokens de API ou credenciais em texto claro. O e-mail do admin provém do segredo `BOOTSTRAP_ADMIN_EMAIL`.
2. **Autodate Mandatório:** Toda collection do tipo `base` deve conter explicitamente os campos `created` e `updated` do tipo `autodate`.
3. **Idempotência e Segurança:** Operações de persistência com `try/catch` defensivo e transações atômicas com `$app.runInTransaction`.
4. **Criação Backend-Only (F1):** `createRule = null` ou restrito para `movements`, `transfers`, `quotes`, `invitations`, `positions` e `account_balances`.
5. **Reversibilidade (Down):** Toda migration deve implementar sua função `down` correspondente para permitir rollback limpo.