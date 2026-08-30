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

## 4. Protocolo de Limpeza Controlada do Ambiente de Desenvolvimento (`/admin/reset-dev`)

> **AVISO DE GOVERNANÇA:** Esta operação está **PERMANENTEMENTE BLOQUEADA** em produção (`NODE_ENV === 'production'`) e só pode ser executada em ambiente de desenvolvimento devidamente autenticado como administrador.

### 4.1 Regras de Bloqueio Estrito

1. **Gate de Ambiente:** Bloqueio imediato se `import.meta.env.PROD` ou `NODE_ENV === 'production'`.
2. **Reautenticação do Administrador:** Confirmação de credenciais ativas.
3. **Frase de Confirmação Obrigatória:** O administrador deve digitar exatamente a frase `LIMPAR AMBIENTE DESENVOLVIMENTO`.
4. **Relatório Prévio (Dry-Run):** Apresentação da contagem de registros a serem eliminados antes da confirmação.

### 4.2 O Que É Preservado Obrigatoriamente (Nunca Apagar)

- O schema do banco de dados e todas as collections criadas.
- Todas as migrations registradas na tabela do sistema.
- Todos os arquivos de pb_hooks, rotas e regras de RLS.
- O registro do Administrador (`BOOTSTRAP_ADMIN_EMAIL`).
- A trilha de auditoria essencial de governança.

### 4.3 O Que É Higienizado em Ambiente Autorizado

- Registros nas collections de domínio: `portfolios`, `institutions`, `accounts`, `account_balances`, `assets`, `positions`, `movements`, `transfers`, `quotes`, `wealth_goals`, `consolidations`.
- Convites pendentes ou expirados na collection `invitations`.
- Arquivos e avatares de teste temporários.

### 4.4 Auditoria Mandatória

Ao concluir a limpeza (ou em caso de falha), um registro de severidade `CRITICAL` é gravado na collection `audit_logs` com timestamp UTC, ID do administrador solicitante e contagem de registros expurgados.
