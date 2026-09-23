# ADR-022: Mecanismo de Backup e Trilha de Auditoria (B2)

## Status

Aceito e Implementado (Capacidade de Restore Implementada; Prova de Execução de Restore em Janela Controlada)

## Contexto

O requisito de governança B2 do projeto _Construindo Meu Futuro_ estabelece a necessidade de backup e recuperação comprovados antes do acúmulo de dados patrimoniais reais em ambiente produtivo.
A instância do backend roda sobre PocketBase v0.36 hospedada no ambiente Skip Cloud. O banco já contém dados reais: conta de superusuário administrativo, convite aceito, e cadastros preliminares de instituições, contas, ativos e movimentações de teste.

Historicamente, probes de backup haviam sido suspensos até autorização formal do usuário. Com a autorização concedida, foi executada a investigação técnica, implementação de endpoint dedicado autenticado para administradores e ativação das telas e trilhas de auditoria.

---

## Decisões Tomadas

### 1. Mecanismo de Backup Nativo do PocketBase

- O PocketBase dispõe nativamente da API `/api/backups` acessível via autorização de superusuário (`PB_SUPERUSER_TOKEN`), operando sobre a URL interna da instância (`PB_INSTANCE_URL`).
- Foi implementado o hook de backend `pocketbase/hooks/backups.js` expondo rotas restritas a usuários autenticados com papel `admin`:
  - `GET /backend/v1/backups`: consulta e lista os arquivos de backup existentes (`key`, `size`, `modified`), convertendo o payload para formato seguro do frontend.
  - `POST /backend/v1/backups`: inicia a geração síncrona/assíncrona de um snapshot completo (`.zip`) contendo a base SQLite (`data.db`) e arquivos estáticos anexos.
- Toda emissão de backup via `POST /backend/v1/backups` grava automaticamente um registro em `audit_logs` (`event_type: 'BACKUP_CREATED'`, `severity: 'info'`, `entity: 'backups'`).

### 2. Análise e Implementação da Capacidade de Restore

- **Comportamento do Restore no PocketBase:** A chamada para restauração (`POST /api/backups/{key}/restore`) faz com que o PocketBase substitua fisicamente o arquivo do banco ativo pelo snapshot selecionado e reinicie o processo do daemon.
- **Implementação do Restore Autenticado (Admin-only):** Foi estendido o hook `pocketbase/hooks/backups.js` com o endpoint `POST /backend/v1/backups/{key}/restore`. Ele valida a permissão de superusuário/admin, proteção rigorosa contra path traversal, validação de existência do arquivo e registra obrigatoriamente o evento `BACKUP_RESTORE_REQUESTED` com severidade `critical` na trilha de auditoria `audit_logs` antes de acionar a restauração.
- **Confirmação de Alto Atrito na UI:** Na interface, a restauração é acionada manualmente pelo administrador e exige confirmação com digitação do nome exato do arquivo snapshot (ex: `testeb2.zip`), exibindo avisos explícitos em pt-BR de operação destrutiva e reinicialização iminente do daemon.
- **Avaliação de Risco e Prova de Execução:** Como a instância contém dados de usuários reais e patrimoniais vivos, a capacidade técnica foi integralmente construída e disponibilizada, enquanto a prova efetiva de disparo destrutivo segue condicionada a janela de manutenção controlada autorizada pelo usuário.

### 3. Ampliação da Cobertura de Auditoria

- A collection `audit_logs` (criada no Lote 1) possui RLS estrito: leitura restrita a administradores (`@request.auth.role = 'admin'`) e bloqueio total de mutação direta pelo cliente (`createRule: null`, `updateRule: null`, `deleteRule: null`).
- O hook `pocketbase/hooks/movements.js` foi ampliado com gravação transacional de auditoria:
  - `MOVEMENT_CREATED`: emitido após a inserção atômica de nova movimentação, contendo valores monetários, IDs de conta e ativo e data de competência.
  - `MOVEMENT_UPDATED`: emitido após qualquer alteração em movimentações não estornadas.
- O hook de convites (`pocketbase/hooks/invitations.js`) mantém os eventos `INVITE_CREATED`, `INVITE_REVOKED` e `INVITE_ACCEPTED`.

### 4. Interface Administrativa e Navegação Dedicada

- **Separação de Auditoria e Backup:** O gerenciamento de backups e snapshots foi desacoplado de `/admin/audit` e alocado em página e rota própria no menu lateral: **Admin → Backup & Restore** (`/admin/backups` em `src/pages/admin/Backups.tsx`).
- A rota `/admin/audit` (`src/pages/admin/Audit.tsx`) passou a focar exclusivamente nos **Logs de Auditoria**: tabela paginada com ordenação decrescente, filtros de eventos (incluindo `BACKUP_CREATED`, `BACKUP_DOWNLOADED` e `BACKUP_RESTORE_REQUESTED`), severidades, usuários e exportação CSV.
- A página `/admin/backups` conta com listagem de snapshots, tamanhos formatados, datas, disparo de novo backup manual, download seguro via filesystem/HTTP e o botão de **Restaurar** com diálogo de alto atrito.

### 5. Escopo do Backup: Global do Sistema (Não por Usuário) e Governança de Acesso

- O mecanismo de backup nativo do PocketBase captura a instância inteira: todas as collections, todos os usuários, todas as movimentações e todo o log de auditoria. Não existe backup isolado por usuário — isso é característica do mecanismo, não escolha de produto, e é coerente com o propósito do B2 (um backup por usuário deixaria dados órfãos, pois movimentações referenciam contas e ativos de outras collections).
- O que é por usuário é a trilha de auditoria: o log registra quem criou, baixou ou pediu restore de cada snapshot.
- Consequência de segurança: como o arquivo de backup contém os dados de todos os usuários, qualquer cópia baixada e guardada fora da instância deve ser tratada como DADO SENSÍVEL — armazenar apenas em local seguro, nunca em compartilhamento aberto.
- Acesso à tela e às rotas é exclusivo de administradores (menu com `requireAdmin`, rota protegida por `ProtectedRoute requireAdmin` e checagem de role `admin` em todas as quatro rotas do hook).

---

## Procedimento Operacional de Restore em Caso de Incidente

Em caso de necessidade de restauração de desastre:

1. Obter a listagem de snapshots via painel administrativo em `/admin/audit` (aba _Backups & Restore B2_) ou via superusuário.
2. Identificar a chave do snapshot desejado (ex: `backup_20260923_103000.zip`).
3. Disparar a restauração via superusuário autenticado:
   ```bash
   POST {PB_INSTANCE_URL}/api/backups/{key}/restore
   Authorization: {PB_SUPERUSER_TOKEN}
   ```
4. O processo PocketBase será reiniciado automaticamente com a integridade restaurada ao ponto do snapshot.

---

## Consequências

- **Positivas:** Conformidade integral com o requisito B2; zero intervenção manual via cliente; imutabilidade da trilha de auditoria; visibilidade total das operações patrimoniais críticas e snapshots disponíveis.
- **Riscos Remanescentes:** O tempo de criação de backup depende do volume de arquivos no storage. Como boa prática recomendada, backups programados automáticos podem ser agendados via cron do sistema se o volume crescer significativamente.
