# Protocolo de Snapshot, Backup, Restauração e Limpeza do Banco de Dados

Este documento especifica os procedimentos operacionais e empíricos para **criação de snapshots, restauração de estado e limpeza controlada** no ambiente **Skip Cloud / PocketBase**.

---

## 1. Topologia de Persistência no Skip Cloud (PocketBase)

- **Instância Dedicada:** O backend PocketBase do projeto é executado de forma dedicada e gerenciada pela infraestrutura da plataforma Skip.
- **Motor de Banco de Dados:** SQLite em arquivo com suporte a transações ACID (`$app.runInTransaction`).
- **Ponto Único de Schema:** O schema e migrations são governados por arquivos JavaScript versionados em `pocketbase/migrations/`.

---

## 2. Procedimento de Snapshot e Backup (Investigação Empírica B2)

### 2.1 Estado Zero e Pré-Requisitos

Antes de aplicar qualquer lote de migrations (especialmente o Lote 1 da Fase 2), deve ser registrado o estado do banco. Atualmente, o banco possui apenas a collection nativa `users` e 0 registros.

### 2.2 Estratégia de Backup da Instância

1. **Snapshots de Infraestrutura Gerenciada:** A plataforma Skip Cloud executa checkpoints contínuos do volume persistente e do estado do sandbox a cada persistência e commit.
2. **Exportação de Dados e Schema:**
   - O schema consolidado pode ser inspecionado a qualquer momento via ferramentas de diagnóstico (`db_show_schema` / `src/lib/pocketbase/schema.json`).
   - O estado das tabelas e registros pode ser consultado via API REST ou `db_query`.
3. **Backup Operacional via API do PocketBase (Admin / Superuser):**
   - O PocketBase possui endpoints nativos em `/api/backups` para criação e download de arquivos `.zip` contendo `data.db` e diretório de arquivos.
   - Em ambiente conectado, funções autenticadas com superuser token podem invocar `$app.createBackup(name)` ou APIs equivalentes.

---

## 3. Procedimento de Restauração e Reversão (Rollback)

Em caso de necessidade de reversão antes ou durante a aplicação de migrations:

### 3.1 Reversão por Migrations Down

- Toda migration criada em `pocketbase/migrations/NNNN_*.js` implementa obrigatoriamente a função de reversão `down`:
  ```javascript
  migrate(
    (app) => {
      // up: aplica schema
    },
    (app) => {
      // down: desfaz schema com app.delete(col)
    },
  )
  ```
- No ciclo da plataforma, caso uma migration falhe ou seja removida antes de ser consolidada, o estado pendente pode ser expurgado ou retificado.

### 3.2 Restauração de Snapshot de Dados

- Em caso de inconsistência grave em ambiente de desenvolvimento, restaura-se o backup nativo via `/api/backups/<name>/restore` ou reexecuta-se o ciclo de migração em base zerada (Clean Slate).

---

## 4. Limpeza Total da Base (`/admin/reset-dev`)

A limpeza é executada pela rota `POST /backend/v1/admin/reset-data` (`pocketbase/hooks/admin_reset.js`),
acionada pela tela `/admin/reset-dev`. Ela substitui a antiga migration `0024_production_total_reset.js`
e pode ser repetida sempre que necessário (ADR-023).

### 4.1 Proteções

1. **Administrador ativo:** a rota recusa qualquer usuário sem `role = admin` e `status = active`.
2. **Habilitação por ambiente:** só funciona se o servidor tiver a variável `ALLOW_DATA_RESET=true`. Sem ela, responde `RESET_DISABLED`. Defina a variável apenas nos ambientes em que a limpeza deve ser possível.
3. **Frase de confirmação:** o corpo da requisição deve conter exatamente `LIMPAR AMBIENTE DESENVOLVIMENTO`.
4. **Transação:** ou todas as collections são limpas, ou nenhuma alteração é aplicada.
5. **Contagem prévia:** a tela mostra quantos registros existem em cada collection antes da confirmação.

### 4.2 O que é apagado

Todos os registros de `alerts`, `account_balances`, `movements`, `positions`, `accounts`, `assets`,
`institutions`, `portfolios`, `invitations` e `audit_logs`, nessa ordem, como na antiga 0024.

A trilha de auditoria anterior (`audit_logs`) também é apagada. Logo após a limpeza, dentro da mesma
transação, é gravado um novo registro `SYSTEM_RESET` (severidade `critical`) com o administrador
responsável, o horário e a contagem apagada por collection.

### 4.3 O que é preservado

- A collection `users` (usuários e administradores).
- O schema, as migrations aplicadas, os hooks e as regras de acesso.
