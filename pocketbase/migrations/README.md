# Planejamento e Sequência de Migrations do PocketBase (Fase 2)

Este diretório destina-se a armazenar as migrations JavaScript do PocketBase (JSVM) para evolução do banco de dados do **Construindo Meu Futuro**.

## 1. Migrations existentes

| Ordinal | Arquivo | Conteúdo |
| --- | --- | --- |
| 0001–0010 | `0001_extend_users_and_bootstrap.js` … `0010_create_movements.js` | Lote 1: acesso, identidade e núcleo contábil (ADR-019) |
| 0020 | `0020_add_due_date_and_indexer_rate.js` | `due_date` e `indexer_rate` em `assets` e `movements` (ADR-020) |
| 0022 | `0022_create_alerts.js` | Collection `alerts` |
| 0023 | `0023_repair_fixed_income_cdbxp_position.js` | Reparo pontual de posição de renda fixa |
| 0024 | `0024_production_total_reset.js` | Limpeza total de dados para início de produção (já executada) |
| 0025 | `0025_accounts_currency_enum.js` | `accounts.currency` como select BRL/USD/EUR |
| 0027 | `0027_create_quotes.js` | Collection `quotes` (cotações brapi.dev e câmbio), convergente |

### Ordinais aposentados

`0011`–`0019`, `0021`, `0026` e `0028` não são usados e **não podem ser reutilizados**
(lista em `RETIRED_ORDINALS` de `scripts/check-migrations.mjs`). `0011`–`0019` eram o
planejamento do Lote 2 (abaixo), que nunca foi criado com esses números. `0028` era um
`create_quotes` duplicado de `0027` e foi removido.

**A próxima migration é a `0029`.**

### Regras para novas migrations

1. **Nunca renomear nem renumerar** uma migration que possa ter sido aplicada. O PocketBase
   registra migrations aplicadas pelo nome do arquivo: um arquivo renomeado roda de novo, e editar
   um arquivo já aplicado não tem efeito nenhum no banco. Apagar só é aceitável para uma duplicata
   sem efeito (como a antiga `0028`), e o ordinal apagado entra em `RETIRED_ORDINALS`.
2. **Uma collection é criada por uma única migration.** Mudanças posteriores (campos, índices,
   regras) vão em uma nova migration de update com o próximo ordinal livre. O guard
   `pnpm run check:migrations` falha se duas migrations criarem a mesma collection.
3. Se uma migration falhou, corrija a causa e crie uma nova migration; não duplique um create.

---

## 1.1. Planejamento original por lotes (histórico)

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

1. **Sem Senhas ou Segredos no Código:** Migrations nunca devem conter senhas fixas, tokens de API, credenciais em texto claro ou criação de registros de usuários (ADR-017 revisada).
2. **Autodate Mandatório:** Toda collection do tipo `base` deve conter explicitamente os campos `created` e `updated` do tipo `autodate`.
3. **Idempotência e Segurança:** Operações de persistência com `try/catch` defensivo e transações atômicas com `$app.runInTransaction`.
4. **Criação Backend-Only (F1):** `createRule = null` ou restrito para `movements`, `transfers`, `quotes`, `invitations`, `positions` e `account_balances`.
5. **Reversibilidade (Down):** Toda migration deve implementar sua função `down` correspondente para permitir rollback limpo.