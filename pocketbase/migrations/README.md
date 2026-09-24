# Migrations do PocketBase

Migrations JavaScript (JSVM) que definem o schema do banco do **Construindo Meu Futuro**.

## Estado atual

| Ordinal | Arquivo | Conteúdo |
| --- | --- | --- |
| 0001 | `0001_baseline_schema.js` | Schema completo: extensão de `users` e as collections `invitations`, `audit_logs`, `portfolios`, `institutions`, `accounts`, `account_balances`, `assets`, `positions`, `movements` e `alerts` |

**A próxima migration é a `0002`.**

A baseline substituiu, em 2026-09-24 (v0.0.126), as migrations 0001–0027 que o projeto acumulou. Elas
estão em [`docs/migrations-history/`](../../docs/migrations-history/README.md) só como histórico e
não são executadas. A baseline foi conferida contra o espelho do banco vivo
(`src/lib/pocketbase/schema.json`) e reproduz o mesmo schema, com uma diferença intencional:
`international` em `assets.asset_class`, valor que o frontend já oferecia.

## Regras para novas migrations

1. **Numeração contínua a partir da 0001.** Nome no padrão `NNNN_snake_case.js`.
2. **Nunca renomear, renumerar nem editar** uma migration que já possa ter sido aplicada. O PocketBase
   registra migrations aplicadas pelo nome do arquivo: um arquivo renomeado roda de novo, e editar um
   arquivo já aplicado não tem efeito no banco.
3. **Uma collection é criada por uma única migration.** Mudanças posteriores (campos, índices, regras)
   vão em uma nova migration de update com o próximo ordinal.
4. **Migrations descrevem schema, não operam dados.** Operações sobre dados, como a limpeza total da
   base, são rotas de backend (`pocketbase/hooks/`), que podem ser executadas quando necessário e
   ficam auditadas.
5. **Se uma migration falhar, corrija a causa em uma nova migration.** Não duplique um create nem
   reenvie uma migration já aplicada.
6. Toda migration implementa `down` para rollback, e toda collection `base` declara os campos
   `created` e `updated` do tipo `autodate`.

O guard `pnpm run check:migrations` (executado no CI) falha se as regras 1 e 3 forem violadas.

## Dependências entre collections

1. `users` → `invitations`, `audit_logs`, `portfolios`, `institutions`
2. `institutions` → `accounts` → `account_balances`
3. `users` → `assets`
4. `accounts` + `assets` → `positions` e `movements`
5. `movements` → `movements.reversal_of_id` (estorno) e `account_balances.last_movement_id`
6. `users` → `alerts`

## Pendências conhecidas

- **`quotes`** (cotações brapi.dev e câmbio): fora da baseline. Quando a integração for retomada, entra
  como uma migration nova (`0002_create_quotes.js`). Até lá, `pocketbase/hooks/quotes.js` e as telas
  que leem cotações tratam a ausência da collection com aviso, sem quebrar.
