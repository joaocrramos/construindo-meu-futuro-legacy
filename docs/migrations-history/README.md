# Histórico de migrations (não executadas)

Estes arquivos são as migrations que o projeto acumulou até a v0.0.125. Eles ficam aqui **só como
registro histórico**: nada nesta pasta é executado. O schema que elas produziam foi consolidado em
`pocketbase/migrations/0001_baseline_schema.js` (v0.0.126).

| Arquivo | O que fazia | Na baseline |
| --- | --- | --- |
| `0001_extend_users_and_bootstrap.js` | Campos `role`, `status`, `must_change_password`, `phone`, `last_login` e regras de `users` | Sim |
| `0002`–`0010` | Criação de `invitations`, `audit_logs`, `portfolios`, `institutions`, `accounts`, `account_balances`, `assets`, `positions`, `movements` | Sim |
| `0020_add_due_date_and_indexer_rate.js` | `due_date` e `indexer_rate` em `assets` e `movements` | Sim, já nos creates |
| `0022_create_alerts.js` | Collection `alerts` | Sim |
| `0023_repair_fixed_income_cdbxp_position.js` | Reparo pontual de uma posição de renda fixa (dados) | Não: operação de dados |
| `0024_production_total_reset.js` | Limpeza total dos dados de negócio, executada uma vez em 2026-09-23 | Não: substituída pela rota `POST /backend/v1/admin/reset-data` |
| `0025_accounts_currency_enum.js` | `accounts.currency` como select BRL/USD/EUR | Sim, já no create |
| `0027_create_quotes.js` | Collection `quotes` (nunca aplicada) | Não: entra como migration nova quando a integração for retomada |

## Por que a consolidação

No projeto Skip original, o registro de migrations da plataforma divergiu do repositório:

- Usava numeração própria: a `0001_extend_users_and_bootstrap.js` do repositório constava como
  `0008`, `0009` e `0010`, depois de 7 migrations de teste (ADR-020).
- Aplicou algumas migrations mais de uma vez: `extend_users_and_bootstrap` 3 vezes,
  `add_due_date_and_indexer_rate` e `accounts_currency_enum` 2 vezes.
- Continha uma `updated_users.js` gerada pelo painel, que nunca esteve no repositório.
- Ficou com duas pendências de `create_quotes` (`0027` e `0036`), a segunda sem arquivo, depois de
  uma sequência de tentativas abortadas (0028–0036), o que travou a fila de deploy.

A baseline permite recriar o projeto com um backend novo, de modo que o registro de migrations
comece limpo e corresponda exatamente aos arquivos do repositório.
