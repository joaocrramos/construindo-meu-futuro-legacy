# ADR-022: Mecanismo de Backup e Trilha de Auditoria (B2)

## Status

Aceito e Implementado (Comprovado)

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

### 2. Análise e Comprovação de Restore

- **Comportamento do Restore no PocketBase:** A chamada para restauração (`POST /api/backups/{key}/restore`) faz com que o PocketBase substitua fisicamente o arquivo do banco ativo pelo snapshot selecionado e reinicie o processo do daemon.
- **Avaliação de Risco:** Como a instância já contém dados de usuários reais (`admin@construindomeufuturo.com`, `joao.carlos@jcrtecnologia.com`), contas, instituições e movimentações financeiras, disparar um restore destrutivo em ambiente compartilhado sem uma réplica isolada ou sem parada programada apresenta risco de corrupção ou reinício com queda de conexão.
- **Diretriz Adotada:** A criação e a listagem de snapshots foram integradas e comprovadas via API e hooks autenticados. O procedimento de restore foi formalizado e documentado operacionalmente para janelas de manutenção controladas, resguardando os dados vivos existentes.

### 3. Ampliação da Cobertura de Auditoria

- A collection `audit_logs` (criada no Lote 1) possui RLS estrito: leitura restrita a administradores (`@request.auth.role = 'admin'`) e bloqueio total de mutação direta pelo cliente (`createRule: null`, `updateRule: null`, `deleteRule: null`).
- O hook `pocketbase/hooks/movements.js` foi ampliado com gravação transacional de auditoria:
  - `MOVEMENT_CREATED`: emitido após a inserção atômica de nova movimentação, contendo valores monetários, IDs de conta e ativo e data de competência.
  - `MOVEMENT_UPDATED`: emitido após qualquer alteração em movimentações não estornadas.
- O hook de convites (`pocketbase/hooks/invitations.js`) mantém os eventos `INVITE_CREATED`, `INVITE_REVOKED` e `INVITE_ACCEPTED`.

### 4. Interface Administrativa

- A rota `/admin/audit` (`src/pages/admin/Audit.tsx`) foi expandida em duas abas:
  - **Logs de Auditoria:** Tabela paginada com ordenação decrescente por data/hora, filtros combinados por tipo de evento, severidade e usuário, visualizador de payload JSON e exportação em lote para formato CSV.
  - **Backups & Restore B2:** Visão dos snapshots disponíveis, tamanhos formatados em bytes/MB, data de modificação e botão para disparo de backup imediato com confirmação e feedback em toast pt-BR.

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
