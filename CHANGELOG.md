# Changelog — Construindo Meu Futuro

Todas as modificações notáveis neste projeto serão documentadas neste arquivo, seguindo as diretrizes do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e [Semantic Versioning](https://semver.org/).

---

## [0.0.112] - 2026-09-24 (Organização do menu Patrimônio com submenu expansível Cadastros e ícone de lixeira para Desativar)

### Modificado (Changed)

- **Reorganização do Menu Lateral de Patrimônio (`src/config/navigation.ts`)**:
  - Reordenada a seção Patrimônio para a estrutura solicitada:
    1. Posições (`/wealth/positions`)
    2. Movimentações (`/wealth/movements`)
    3. Transferências (`/wealth/transfers`)
    4. Vencimentos (`/wealth/maturities`)
    5. Submenu Cadastros (sem `href`, com 4 filhos: Instituições `/wealth/institutions`, Contas `/wealth/accounts`, Carteiras `/wealth/portfolios`, Metas `/wealth/goals`)
    6. Consolidação Patrimonial (`/wealth/consolidation`)
  - Atualizada a interface `NavItem` com suporte a `children?: NavItem[]` e `href` opcional.
  - Rotas de Ativos (`/wealth/assets`) e Cotações (`/wealth/quotes`) permanecem ativas na aplicação (`App.tsx`).
- **Submenu Expansível e Contraível (`src/components/AppLayout.tsx`)**:
  - Implementado gatilho com chevron animado para o submenu "Cadastros" tanto na sidebar desktop quanto no menu mobile (drawer).
  - Estado aberto/fechado com persistência em `sessionStorage` (`cmf_nav_cadastros_open`).
  - Abertura automática quando a rota corrente for uma das páginas filhas de Cadastros.
  - Subitens renderizados com recuo visual (`pl-6`, tipografia compacta `text-[11px]`).
- **Substituição do Botão "Desativar" por Ícone de Lixeira (`Trash2`)**:
  - Aplicado nas tabelas de listagem de 3 telas patrimoniais:
    - `src/pages/wealth/Institutions.tsx`: botão icon-only `h-7 w-7 p-0` com `<Trash2 className="h-3.5 w-3.5" />`, `title="Desativar"` e `aria-label="Desativar instituição"`.
    - `src/pages/wealth/Accounts.tsx`: botão icon-only `h-7 w-7 p-0` com `<Trash2 className="h-3.5 w-3.5" />`, `title="Desativar"` e `aria-label="Desativar conta"`.
    - `src/pages/wealth/Assets.tsx`: botão icon-only `h-7 w-7 p-0` com `<Trash2 className="h-3.5 w-3.5" />`, `title="Desativar"` e `aria-label="Desativar ativo"`.
  - Preservados os botões texto "Ativar" para registros inativos, o acionamento de `toggleTarget` e o modal `ConfirmDialog` de confirmação de segurança.
- **Suíte de Testes Automatizados**:
  - `src/test/navigation.test.ts`: testes atualizados para validar a nova sequência exata de itens e subitens do menu Patrimônio.
  - `src/test/appLayoutSubmenu.test.tsx`: novo teste de componente validando expandir/contrair, persistência em `sessionStorage` e auto-abertura por rota filha.
  - `src/test/wealthInstitutionsAccounts.test.tsx` e `src/test/wealthAssetsPositionsMovements.test.tsx`: testes adicionados para validar botões de lixeira (`Trash2`) com `title="Desativar"` e seus respectivos `aria-label`.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.112` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.111] - 2026-09-24 (Preenchimento automático de last_login via hook onRecordAuthRequest)

### Corrigido (Fixed)

- **Preenchimento de `last_login` do Usuário na Autenticação (`pocketbase/hooks/auth.js`)**:
  - Implementado hook de backend no PocketBase utilizando o evento nativo `onRecordAuthRequest(..., 'users')`.
  - A cada autenticação bem-sucedida (login por senha, refresh de sessão ou conclusão de registro/aceite de convite), após a resolução do `e.next()`, o hook atualiza o campo `users.last_login` com o timestamp ISO UTC atual (`new Date().toISOString()`) e persiste via `$app.save(record)`.
  - Resiliência total: qualquer eventual falha na gravação do `last_login` é capturada em bloco `try/catch` e registrada em log de erro sem jamais interromper ou bloquear a resposta de autenticação do usuário.
- **Suíte de Testes Automatizados (`src/test/authLastLoginHook.test.ts`)**:
  - Adicionado teste automatizado validando a estrutura e os padrões exigidos no arquivo `pocketbase/hooks/auth.js`, além de testes comportamentais da lógica de atualização do campo `last_login`, isolamento por collection e tolerância a falhas na camada de dados.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.111` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.110] - 2026-09-24 (Limpeza total da base para início de produção com confirmação de alto atrito e registro em auditoria)

### Removido (Removed)

- **Limpeza Total de Dados de Negócio para Início de Produção (`pocketbase/migrations/0024_production_total_reset.js`)**:
  - Operação destrutiva e definitiva aprovada e confirmada expressamente pelo usuário dono do produto em chat com confirmação de alto atrito.
  - Expurgados integralmente todos os registros de teste das 10 collections de negócio da aplicação, respeitando a ordem topológica de dependências de foreign keys:
    1. `alerts` (alertas do sistema e vencimentos)
    2. `account_balances` (saldos projetados de caixa)
    3. `movements` (lançamentos de aporte, resgate, compra, venda, dividendos e estornos)
    4. `positions` (custódia contábil de ativos)
    5. `accounts` (contas bancárias e corretoras)
    6. `assets` (catálogo privado de ativos e títulos)
    7. `institutions` (instituições financeiras)
    8. `portfolios` (carteiras patrimoniais)
    9. `invitations` (convites pendentes e aceitos)
    10. `audit_logs` (expurgo de logs de teste legados)
  - **Preservação Absoluta Garantida**: A collection nativa de autenticação (`users` / `_pb_users_auth_`) foi integralmente preservada, mantendo o usuário proprietário (`joao.carlos@jcrtecnologia.com`) e o administrador de bootstrap ativos com suas senhas e credenciais inalteradas.

### Adicionado (Added)

- **Trilha de Auditoria Indelével do Reset (`audit_logs`)**:
  - Logo após o expurgo das tabelas dependentes, a rotina recriou imediatamente o registro de auditoria canônico com o evento `SYSTEM_RESET`, severidade `critical`, entidade `system`, summary `"Limpeza total da base executada com sucesso para início de produção."` e vinculação direta ao usuário administrador proprietário `joao.carlos@jcrtecnologia.com`.
- **Interface de Governança e Alto Atrito (`src/pages/admin/ResetDev.tsx`)**:
  - Página `/admin/reset-dev` reformulada para exibir o status em tempo real da higienização:
    - Banner de confirmação de base limpa com data/hora da execução e responsável.
    - Grid de conferência das 9 entidades de negócio exibindo a contagem zerada em tempo real.
    - Mecanismo de alto atrito padrão ADR-022 para salvaguarda: botão destrutivo nunca executa em 1 clique, exigindo abertura de modal e digitação da frase de segurança exata `LIMPAR AMBIENTE DESENVOLVIMENTO`.
- **Validação de Integridade de Migrations (`src/test/checkMigrations.test.ts`)**:
  - Adicionado caso de teste validando que a migration `0024_production_total_reset.js` cumpre integralmente os requisitos de integridade, sequência cronológica e integridade referencial.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.110` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.109] - 2026-09-24 (Correção da rota /admin/reset-dev e tratamento amigável de 404)

### Corrigido (Fixed)

- **Registro da Rota `/admin/reset-dev` (`src/App.tsx`)**:
  - Habilitado o registro incondicional da rota protegida `/admin/reset-dev` apontando para o componente de governança `AdminResetDevPage` (`src/pages/admin/ResetDev.tsx`), eliminando o erro de 404 e runtime no preview ao navegar pelo menu lateral Admin → "Limpeza do Ambiente de Dev" ou diretamente.
  - A tela exibe de forma segura e clara as informações de governança e travas de proteção em 5 camadas com o botão de execução desabilitado e bloqueado, garantindo conformidade com o menu de navegação e as regras da aplicação.
- **Tratamento Amigável de Página 404 (`src/pages/NotFound.tsx`)**:
  - Ajustado o log de aviso em rota inexistente de `console.error` para `console.warn`, impedindo que acessos a URLs inexistentes gerem runtime errors nos interceptadores de console dos ambientes de preview.
- **Suíte de Testes Automatizados (`src/test/navigation.test.ts`)**:
  - Adicionado caso de teste validando o item de menu "Limpeza do Ambiente de Dev" com link `/admin/reset-dev` e proteção `requireAdmin`.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.109` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.108] - 2026-09-24 (Envio de e-mail transacional via Resend para novos alertas de vencimento crítico)

### Adicionado (Added)

- **Envio de E-mail via Resend para Alertas de Vencimento Crítico (`pocketbase/hooks/alerts.js`)**:
  - Implementado disparo automático de e-mail transacional via API do Resend no cron diário (`daily_alerts_check`) e no endpoint de acionamento manual (`POST /backend/v1/alerts/run-check`) quando nasce um alerta NOVO com severidade `critical`.
  - Escala de severidade de vencimentos parametrizada e documentada:
    - Vencimento hoje (`diffDays === 0`, tipo `maturity_today`): severidade `critical` (dispara e-mail imediato).
    - Vencimento em 7 dias (`diffDays === 7`, tipo `maturity_upcoming`): severidade `critical` (dispara e-mail imediato).
    - Vencimento em 15 dias (`diffDays === 15`, tipo `maturity_upcoming`): severidade `warn`.
    - Vencimento em 30 dias (`diffDays === 30`, tipo `maturity_upcoming`): severidade `info`.
  - Consistência total com o padrão de integração HTTP do Resend já adotado no hook `invitations.js` utilizando variáveis `$os.getenv` (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `SITE_URL`).
  - Respeito à anti-duplicidade do motor: alertas pré-existentes nunca disparam novos e-mails.
  - Template de e-mail focado e elegante em pt-BR com assunto `⚠️ Vencimento crítico: [nome do ativo] [em X dias | hoje]`, valor financeiro aplicado em R$, data civil formatada sem deslocamento de fuso e link para `/overview/alerts`.
  - Resiliência: falha no envio de e-mail nunca interrompe a verificação nem a criação dos registros em banco, logando os sucessos e eventuais falhas com identificação do usuário e alerta.
- **Suíte de Testes Automatizados (`src/test/alertsPage.test.tsx`)**:
  - Adicionados testes conceituais e integrados para o disparo do e-mail de alerta crítico via Resend:
    - 1. Alerta crítico novo dispara e-mail com parâmetros e formatação corretos.
    - 2. Alerta repetido é ignorado pela anti-duplicidade sem reenvio de e-mail.
    - 3. Falha ou exceção no Resend não quebra o fluxo de verificação e registra log de advertência.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.108` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.107] - 2026-09-24 (Correção definitiva de timeout e isolamento de fake timers em overviewPages)

### Corrigido (Fixed)

- **Fake Timers e Prevenção de Cascata de Timeouts (`src/test/overviewPages.test.tsx` e `src/test/setup.ts`)**:
  - Configurado `vi.useFakeTimers({ shouldAdvanceTime: true })` no teste de fuso de `DueDatesOverviewPage`, permitindo que os intervalos e timers internos do `waitFor` avancem em tempo real sem travar a resolução assíncrona.
  - Adicionado `afterEach(() => { vi.useRealTimers() })` na suíte de testes de `overviewPages.test.tsx` e no setup global (`src/test/setup.ts`), garantindo restauração imediata dos timers reais mesmo em caso de falha de asserção, eliminando vazamento de estado e efeito dominó/cascata em testes subsequentes.
  - Preservadas integralmente todas as asserções de fuso e vencimento ("30/09/2026", ausência de "29/09/2026", "10 dias restantes", "Em 10 dias").
- **Mock Parcial dos Serviços `portfolios` e `alerts` (`src/test/overviewPages.test.tsx`)**:
  - Aplicado mock parcial com factory assíncrona e `importOriginal` para `@/services/portfolios` e `@/services/alerts`, preservando constantes exportadas (`ALERT_TYPE_LABELS`, `ALERT_SEVERITY_LABELS`) e impedindo que o automock do Vitest esvazie arrays e mapeamentos.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.107` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.106] - 2026-09-24 (Remoção de artefatos de debug commitados por engano)

### Removido (Removed)

- **Remoção de artefatos de debug commitados por engano**:
  - Removido `src/test/tempEnvCheck.test.ts` (debug com asserção que falhava de propósito).
  - Removido `src/test/gitVerifier.test.ts` (debug com asserções git).
  - Removido `scripts/git-push-check.mjs` (script de debug).
  - Revertidas alterações indevidas de probe/diagnóstico em `src/lib/utils.ts` e `src/test/checkMigrations.test.ts`.

---

## [0.0.104] - 2026-09-24 (Remoção do arquivo de debug e consolidação da correção de timezone)

### Removido (Removed)

- **Higienização de Arquivos de Teste e Debug**:
  - Removido `src/test/tempEnvCheck.test.ts`, arquivo de teste investigativo de debug adicionado indevidamente em rodada anterior, eliminando asserções forçadas e chamadas de subprocesso do runner de testes.

### Corrigido (Fixed)

- **Formatação de Datas Civis em `formatDateBRL` (`src/lib/formatters.ts`)**:
  - Quando a entrada for uma string iniciando com data civil ISO (`/^\d{4}-\d{2}-\d{2}/`) e `includeTime` for falso ou omitido, os componentes da data civil (ano, mês e dia) são extraídos diretamente da string, retornando `dd/mm/aaaa` sem sofrer desvio de fuso horário decorrente de conversão de UTC meia-noite para fusos negativos (ex.: `America/Sao_Paulo` UTC-3 exibindo dia 29 em vez de 30).
  - Preservado integralmente o comportamento prévio para timestamps com hora (`includeTime: true`), instâncias de `Date` e números.
- **Cálculo de Vencimentos em `DueDatesOverviewPage` (`src/pages/overview/DueDates.tsx`)**:
  - Substituída a obtenção de `nowStr` via `toISOString()` pela data civil local baseada no calendário local (`getFullYear()`, `getMonth() + 1`, `getDate()`).
  - O cálculo de `daysRemaining` agora opera sobre a diferença entre datas civis locais puras (`new Date(y, m - 1, d)` de ambos os lados), com arredondamento seguro (`Math.round`), eliminando desvios após as 21h no horário de Brasília.
  - A verificação de expiração (`isExpired`) compara as strings de data civil `YYYY-MM-DD`.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.104` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.103] - 2026-09-24 (Correção de formatação e cálculo civil de datas de vencimento no fuso horário brasileiro)

### Corrigido (Fixed)

- **Formatação de Datas Civis em `formatDateBRL` (`src/lib/formatters.ts`)**:
  - Quando a entrada for uma string iniciando com data civil ISO (`/^\d{4}-\d{2}-\d{2}/`) e `includeTime` for falso ou omitido, os componentes da data civil (ano, mês e dia) são extraídos diretamente da string, retornando `dd/mm/aaaa` sem sofrer desvio de fuso horário decorrente de conversão de UTC meia-noite para fusos negativos (ex.: `America/Sao_Paulo` UTC-3 exibindo dia 29 em vez de 30).
  - Preservado integralmente o comportamento prévio para timestamps com hora (`includeTime: true`), instâncias de `Date` e números.
- **Cálculo de Vencimentos em `DueDatesOverviewPage` (`src/pages/overview/DueDates.tsx`)**:
  - Substituída a obtenção de `nowStr` via `toISOString()` pela data civil local baseada no calendário local (`getFullYear()`, `getMonth() + 1`, `getDate()`).
  - O cálculo de `daysRemaining` agora opera sobre a diferença entre datas civis locais puras (`new Date(y, m - 1, d)` de ambos os lados), com arredondamento seguro (`Math.round`), eliminando desvios após as 21h no horário de Brasília.
  - A verificação de expiração (`isExpired`) compara as strings de data civil `YYYY-MM-DD`.
- **Suíte de Testes Automatizados**:
  - Adicionado teste de regressão em `src/test/formatters.test.ts` validando a formatação de `"2026-09-30 00:00:00.000Z"` como `"30/09/2026"` e a preservação de `includeTime: true`.
  - Adicionado teste de regressão em `src/test/overviewPages.test.tsx` cobrindo o cálculo de `daysRemaining` e a exibição de vencimento para `2026-09-30` sob horário noturno simulado.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.103` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.102] - 2026-09-24 (Cálculo de posições de Renda Fixa por valor e reparo do CDB XP)

### Corrigido (Fixed)

- **Cálculo de Posições de Renda Fixa por Valor (`pocketbase/hooks/movements.js`)**:
  - Nas rotas `POST` e `PUT /backend/v1/movements`, o recálculo contábil de posições agora diferencia a classe do ativo: para `asset_class === 'fixed_income'`, o cálculo opera por valor financeiro (reais) em vez de contagem de cotas.
  - Aportes/compras somam o valor aplicado ao custo total; resgates/vendas parciais abatem o valor resgatado diretamente do custo total (com piso zero).
  - Posições com saldo positivo mantêm `quantity_e8 > 0` normalizado na escala R$ 1,00/unidade e `average_price_cents = 100`, tornando a posição imediatamente elegível para varreduras do motor de alertas (`alerts.js`).
  - As demais classes (ações, FIIs, cripto, fundos, outros) mantêm estritamente o algoritmo ponderado por cotas inalterado.
- **Derivação de Posições no Frontend (`src/services/positions.ts`)**:
  - Ajustada a função `derivePositionsFromMovements` com a mesma regra por valor para ativos com `asset_class === 'fixed_income'`, garantindo paridade total entre a projeção do frontend e a persistência no backend.
- **Migration de Reparo (`pocketbase/migrations/0023_repair_fixed_income_cdbxp_position.js`)**:
  - Posição `e5ryvrhz6kbcwoq` (CDB XP id `yd09o24dmlc4rbg`, conta `0n8mennpev0x5kp`, usuário `6ib7abl76x921af`) recalculada e corrigida para saldo de R$ 3.000,00 (`total_cost_cents = 300000`, `quantity_e8 = 300000000000`, `average_price_cents = 100`, `maturity_date = 2026-09-30`, `indexer = CDI (100%)`).
  - Registro de auditoria gerado na collection `audit_logs` (`event_type = 'POSITION_RECALCULATED'`).
- **Testes Automatizados (`src/test/fixedIncomePositions.test.ts`)**:
  - Cobertura de compra R$ 5.000 + venda parcial R$ 2.000 em renda fixa com saldo R$ 3.000 e `quantity_e8 > 0`, resgate total zerando posição e preservação do algoritmo por cotas em ações.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.102` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.101] - 2026-09-24 (Sincronização de vencimento de ativos para posições e motor de alertas)

### Corrigido (Fixed)

- **Motor de Alertas e Cron Diário (`pocketbase/hooks/alerts.js`)**:
  - Ajustada a rotina de varredura de vencimentos (`daily_alerts_check` e `POST /backend/v1/alerts/run-check`) para buscar todas as posições ativas (`quantity_e8 > 0`) e resolver a data de vencimento tanto pelo campo `maturity_date` da posição quanto pelo `due_date` do cadastro do ativo vinculado (`assets`).
  - Sincroniza retroativamente os campos `maturity_date` e `indexer` na posição caso estejam vazios e o ativo contenha os dados preenchidos.
  - Preservadas integralmente as regras de janela de alertas (hoje com severidade warn, 30/15/7 dias) e anti-duplicidade estrita (`user_id`, `type`, `reference_id`, `due_date`).
- **Hook de Movimentações (`pocketbase/hooks/movements.js`)**:
  - Na criação e atualização de posições nos endpoints `POST` e `PUT /backend/v1/movements`, incluída a propagação de `maturity_date` e `indexer` a partir do cadastro do ativo (`assets`) ou dados da movimentação, eliminando a orfandade desses campos em posições futuras.
- **Interface da Central de Alertas (`src/pages/overview/Alerts.tsx`)**:
  - Adicionado o botão "Verificar Alertas" no cabeçalho da página, conectado a `triggerAlertsCheck()` (`POST /backend/v1/alerts/run-check`), permitindo ao usuário acionar e testar a varredura de alertas sob demanda.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.101` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.99] - 2026-09-23 (Polyfill de scrollIntoView para Radix Select nos testes de Ativos)

### Corrigido (Fixed)

- **Polyfill de `Element.prototype.scrollIntoView` (`src/test/setup.ts`)**:
  - O JSDOM não implementa `scrollIntoView`. Ao abrir, o Radix Select o chama no item selecionado; a exceção não capturada desmontava a árvore React e o teste 4 de Ativos (Renda Fixa) não encontrava o Select "Tipo de Título de Renda Fixa" (body vazio no dump do CI).
  - Com o stub no setup global, a suíte completa passa (145/145) e o `pnpm run verify` conclui sem erros.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.99` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.98] - 2026-09-23 (Correção definitiva dos testes de Movimentações e Ativos com mock parcial e polyfill ResizeObserver)

### Corrigido (Fixed)

- **Mock Parcial em `movements` e `assets` (`src/test/wealthAssetsPositionsMovements.test.tsx`)**:
  - Substituído automock integral `vi.mock('@/services/movements')` e `vi.mock('@/services/assets')` por mock parcial preservando constantes canônicas reais via `importOriginal` (`ASSET_REQUIRED_MOVEMENTS`, `FIXED_INCOME_SUBTYPES`, `FIXED_INCOME_INDEXERS`, `ASSET_SUBTYPES_BY_CLASS`, `ASSET_CLASS_LABELS`).
  - Corrige esvaziamento silencioso de arrays exportados pelo Vitest, garantindo renderização dos campos de Renda Fixa, Preço, Quantidade e opções dos Selects Radix.
- **Polyfill de `ResizeObserver` (`src/test/setup.ts`)**:
  - Adicionado stub global para `ResizeObserver` no setup de testes para suporte à medição de layout de componentes Radix UI (`Select`, `Checkbox`) em ambiente JSDOM.
- **Alinhamento dos Testes de Ativos à UI Atual (`src/test/wealthAssetsPositionsMovements.test.tsx`)**:
  - Atualizada a consulta de rótulo para "Subtipo / Segmento" no teste 3 de Ativos.
  - No teste 4 de Renda Fixa, atualizada a interação para acionar os triggers dos Radix Selects ("Classe de Ativo" e "Tipo de Título de Renda Fixa") e selecionar as opções correspondentes.
  - Ajustada a consulta do botão de abertura de modal nos testes de Movimentações para `/Registrar primeira movimentação/i`, prevenindo colisão de elementos múltiplos no getByRole.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.98` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.97] - 2026-09-23 (Aguardar renderização do formulário de Movimentações com findByLabelText Tipo de Operação)

### Corrigido (Fixed)

- **Estabilização da Suíte de Movimentações (`src/test/wealthAssetsPositionsMovements.test.tsx`)**:
  - Nos testes 6, 7 e 8 do bloco `CRUD de Movimentações (/wealth/movements)` (incluindo o loop de casos do teste 8), substituída a espera `findByRole('dialog')` por `await screen.findByLabelText(/Tipo de Operação/i, {}, { timeout: 10000 })`.
  - Garante que as asserções só ocorram após a efetiva montagem dos campos do formulário no DOM, prevenindo falsos negativos caso o modal abra antes da prontidão do formulário.
  - Verificados os mocks dos testes 6, 7 e 8: todos já forneciam contas válidas (`accService.listAccounts`), confirmando pré-condição atendida.
  - 100% das asserções de negócio e regras patrimoniais preservadas sem qualquer alteração no código de produção.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.97` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.96] - 2026-09-23 (Eliminação de condição de corrida nos testes 6, 7 e 8 de Movimentações Patrimoniais)

### Corrigido (Fixed)

- **Estabilização Determinística da Suíte de Movimentações (`src/test/wealthAssetsPositionsMovements.test.tsx`)**:
  - Eliminada a condição de corrida em ambientes com contenção de CPU (como runners do GitHub Actions) nos testes 3, 5, 6, 7 e 8 do bloco `CRUD de Movimentações (/wealth/movements)`.
  - Adicionada sincronização assíncrona explícita aguardando a resolução de `loadData()` através da renderização de seu empty state (`await screen.findByText(/Nenhuma movimentação lançada/i, {}, { timeout: 10000 })`) antes de acionar a abertura da modal de cadastro de movimentações.
  - Assegurado que `selectedAsset` e a lista de contas/ativos estejam plenamente populados ao abrir a modal, garantindo que os blocos condicionais do formulário ("Renda Fixa — Detalhes do Título", "Preço (USD)", "Outros Custos (USD)", "Quantidade") renderizem deterministicamente.
  - 100% das asserções de negócio e regras patrimoniais rigorosamente preservadas, sem qualquer alteração no código de produção.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.96` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.95] - 2026-09-23 (Botões de edição icon-only nas tabelas patrimoniais)

### Modificado (Changed)

- **Ações de Linha nas Tabelas Patrimoniais (`/wealth/assets`, `/wealth/accounts`, `/wealth/institutions`, `/wealth/movements`)**:
  - Removido o rótulo textual 'Editar' dos botões de ação de linha, passando a exibir exclusivamente o ícone (`Edit2`).
  - Preservados os atributos de acessibilidade e tooltip nativo `title="Editar"` e `aria-label="Editar"`, assegurando conformidade de acessibilidade (WCAG) e estabilidade de seletores de teste (`getByRole('button', { name: 'Editar' })` ou `getByRole('button', { name: /Editar/i })`).
  - Ajustadas as dimensões e espaçamento para o padrão icon-only (`h-7 w-7 p-0 text-muted-foreground hover:text-foreground`), preservando o visual compacto e as variantes dos botões.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.95` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.94] - 2026-09-23 (Alinhamento dos mocks dos testes 6, 7 e 8 de Movimentações Patrimoniais)

### Corrigido (Fixed)

- **Alinhamento dos Mocks com `AssetRecord` (`src/test/wealthAssetsPositionsMovements.test.tsx`)**:
  - Ajustados os mocks dos testes 6, 7 e 8 para fornecer os objetos completos no formato real retornado por `listAssets()` (`asset_class`, `sub_type`, `due_date`, `indexer_rate`, `currency`, `is_active`).
  - Corrigida a renderização condicional do diálogo de lançamento de movimentações para Renda Fixa ("Renda Fixa — Detalhes do Título", "Valor Aplicado (R$)"), ativos internacionais em dólar ("Preço (USD)", "Outros Custos (USD)") e campo "Quantidade" para todas as classes e tipos de ativos avaliados no teste 8 (Ações, FII, BDR, Cripto, USD, Fundos e Outros).
  - Todas as asserções de negócio e regras patrimoniais rigorosamente preservadas.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.94` sincronizada em `VERSION`, `package.json` e `CHANGELOG.md`.

---

## [0.0.37] - 2026-09-23 (Tipologia de ativos fixada no cadastro e herdada nos lançamentos)

### Modificado (Changed)

- **Cadastro de Ativos (`/wealth/assets`, `src/pages/wealth/Assets.tsx`)**:
  - Adicionada a seleção de Tipo/Subtipo padronizada conforme `docs/ASSET_TYPES.md` e `FIXED_INCOME_SUBTYPES` (CDB, Tesouro Direto, LCI, LCA, CRI, CRA, Debêntures, Ações, FIIs, etc.).
  - Para títulos de Renda Fixa, incluída parametrização direta no cadastro do ativo com Forma (Pós-Fixado ou Pré-Fixado), Indexador (CDI, CDI+, IPCA+, SELIC), Taxa (%) e Data de Vencimento contratada.
  - O ativo armazena a tipologia (`sub_type`), rentabilidade (`indexer_rate`) e vencimento (`due_date`) de forma única e definitiva.
- **Lançamento de Movimentações (`/wealth/movements`, `src/pages/wealth/Movements.tsx`)**:
  - Removida qualquer seleção redundante de tipo ou subtipo do título no momento do lançamento.
  - Ao selecionar um ativo, o formulário herda automaticamente sua classe, tipo, taxa contratada e data de vencimento.
  - Para títulos de Renda Fixa, campos adaptados passam a focar estritamente na transação: "Valor Aplicado (R$)" ou "Valor do Resgate (R$)" e vencimento da operação, exibindo em badge informativo o subtipo e a taxa herdados do ativo.
- **Serviço de Ativos (`src/services/assets.ts`)**:
  - Inclusão do subtipo 'Tesouro Direto' na lista canônica `FIXED_INCOME_SUBTYPES`.
  - Exportação de `ASSET_SUBTYPES_BY_CLASS` para categorização assistida nas demais classes (Ações, FIIs, Fundos, Cripto).
- **Suíte de Testes Automatizados (`src/test/wealthAssetsPositionsMovements.test.tsx`)**:
  - Atualizados os testes de Assets e Movements para validar a criação de ativos com tipo/subtipo e taxa, a herança automática no lançamento de Renda Fixa com Valor Aplicado, preservando 100% das asserções de negócio e isolamento de DOM.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.37` sincronizada em `VERSION` e `CHANGELOG.md`.

---

## [0.0.36] - 2026-09-23 (Estabilização definitiva de montagem de modal e CI sob carga adversa)

### Corrigido (Fixed)

- **Estabilização de Diálogos Radix no Setup Global (`src/test/setup.ts`)**:
  - Mock global de `window.matchMedia` com suporte explícito a `prefers-reduced-motion: reduce`, eliminando atrasos e transições de entrada de componentes Radix (`Dialog`, `Tooltip`, etc.) no runner headless.
  - Injeção global no `<head>` de folha de estilo que zera `animation-duration`, `animation-delay` e `transition-duration` durante a execução de testes, garantindo que o portal de diálogo monte deterministicamente no DOM.
- **Configuração de Vitest e Timeouts (`vitest.config.ts`)**:
  - Elevado `testTimeout: 10000` no Vitest para runners de CI com contenção de CPU.
- **Robustez de Seleção e Montagem Assíncrona (`src/test/wealthAssetsPositionsMovements.test.tsx`)**:
  - Nos testes 6 e 7 de Movimentações (`/wealth/movements`), adicionada sincronização explícita com `waitFor` aguardando o carregamento dos dados da página antes do clique em "Registrar primeira movimentação".
  - Configurados timeouts adequados (4000ms) nas consultas `findByRole('dialog')` e `findByText` / `findByLabelText`.
  - Todas as asserções de negócio e regras de formulário de Renda Fixa, Ações e Ativos em USD foram rigorosamente mantidas.
- **Governança de Versionamento (ADR-006)**:
  - Incremento de versão semântica para `0.0.36` sincronizada em `VERSION` e `CHANGELOG.md`.

---

## [0.0.35] - 2026-09-23 (Sincronização do repositório e confirmação de deploy)

### Operacional / Governança

- **Confirmação e alinhamento de sincronização**:
  - Validação da integridade da esteira de qualidade (check de versão, migrations, lint, typecheck, testes e build).
  - Garantia de que todos os ajustes das rodadas anteriores (configuração global do Vitest, isolamento de DOM com cleanup e estabilização das suítes de testes de Movimentações e Central de Alertas) estão persistidos e integrados à branch principal.

---

## [0.0.34] - 2026-09-23 (Conclusão da rodada de correção do CI e setup global com cleanup)

### Corrigido (Fixed)

- **Configuração global do Vitest (`vitest.config.ts` e `src/test/setup.ts`)**:
  - Ativado `setupFiles: ['./src/test/setup.ts']` executando `cleanup()` após cada teste (`afterEach`) para isolamento hermético do DOM.
- **Resolução de assincronismo em `src/test/wealthAssetsPositionsMovements.test.tsx`**:
  - Testes 6, 7 e 8 ajustados para aguardar deterministicamente a abertura do diálogo com `await screen.findByRole('dialog')` e seleção assíncrona com `findByRole` / `findByLabelText`.
  - Todas as asserções de negócio e regras de formulário patrimonial estritamente mantidas e aprovadas.
- **Desacoplamento e padronização na Central de Alertas (`src/test/alertsPage.test.tsx` e `src/test/overviewPages.test.tsx`)**:
  - Mocks centralizados no serviço `@/services/alerts` (`listAlerts`, `markAlertRead`, `markAllAlertsRead`), eliminando vazamentos de mock do client PocketBase.
  - Sincronização assíncrona robusta nas consultas da interface com `findByText` e `findByTitle`.
- **Pipeline de Integração Contínua (CI)**:
  - 100% de aprovação na esteira completa (`check:version`, `check:migrations`, `lint:ci`, `tsc --noEmit`, testes Vitest e build de produção Vite).

---

## [0.0.33] - 2026-09-23 (Realinhamento da suíte de testes de Alertas e Movimentações Patrimoniais)

### Corrigido (Fixed)

- **Correção da suíte de testes em `src/test/wealthAssetsPositionsMovements.test.tsx`**:
  - Seleção por label `/Valor Bruto/i` no cadastro de movimentação em vez de consulta por placeholder ambíguo (`'0,00'`).
  - Ajuste no mock de ativos para isolar o ativo de classe renda fixa (`fixed_income`), garantindo renderização correta de detalhes do título e campos de valor aplicado.
  - Ordenação correta do mock de ativos para garantir que o ativo internacional em USD (`AAPL`) seja selecionado por padrão nos testes de campos internacionais.
- **Correção dos testes de Overview e Central de Alertas em `src/test/overviewPages.test.tsx`**:
  - Atualizado o mock da Central de Alertas para apontar para o serviço centralizado `@/services/alerts` (`listAlerts`, `markAlertRead`), eliminando erros de chamada direta legada a `pb.collection`.
- **Correção de seletores na suíte `src/test/alertsPage.test.tsx`**:
  - Ajustado o seletor do botão de alternância de leitura para `getByTitle(/Marcar como lido/i)`.
- **Integração Contínua (CI)**:
  - 100% dos testes da suíte (144+ testes em 21 arquivos) passando localmente e no pipeline de CI.

---

## [0.0.32] - 2026-08-30 (Ajustes Documentais e Início do Lote 1 com Migration 0001)

### Adicionado (Added)

- **Início do Lote 1 de Migrations (ADR-019)**:
  - Implementada e aplicada a migration `pocketbase/migrations/0001_extend_users_and_bootstrap.js`.
  - Extensão da collection nativa `users` (`_pb_users_auth_`) com os campos:
    - `role`: `select` (`['admin', 'user']`, obrigatório, maxSelect: 1)
    - `status`: `select` (`['active', 'suspended', 'pending']`, obrigatório, maxSelect: 1)
    - `must_change_password`: `bool` (opcional)
    - `phone`: `text` (opcional, max: 30)
    - `last_login`: `date` (opcional)
  - Regras de RLS configuradas em `users` em total conformidade com `docs/DATABASE_SCHEMA.md`:
    - `listRule`: `@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)`
    - `viewRule`: `@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)`
    - `createRule`: `@request.auth.role = 'admin'`
    - `updateRule`: `@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)`
    - `deleteRule`: `@request.auth.role = 'admin'`
  - Mecanismo seguro e replayável de bootstrap do administrador a partir de `BOOTSTRAP_ADMIN_EMAIL` (`status='pending'`, `must_change_password=true`, senha aleatória de alta entropia inutilizável, sem logs e sem efeitos colaterais).
- **Registro da ADR-020 (`docs/DECISIONS.md`)**:
  - Formalizada a independência de espaços entre os ordinais de migrations do repositório (`0001` a `0014`, ADR-019) e os registros da tabela interna `_migrations` do PocketBase (chaveados por nome de arquivo `file`).
  - Preservação histórica dos registros e vedação expressa de edição manual de `_migrations`.

### Corrigido (Fixed)

- **Contagem e Documentação de Testes (`docs/TESTING.md`)**:
  - Atualizada a contagem de testes para **56 testes aprovados em 9 arquivos de teste** (saída real do Vitest), incluindo as seções `checkMigrations` (8 testes) e `errorBoundary` (3 testes).
- **Alinhamento do Título da Versão [0.0.30] no CHANGELOG.md**:
  - Corrigido o título da seção `[0.0.30]` para refletir com precisão o corpo ("Limitação B2 Não Comprovada" em vez de "Prova B2").

---

## [0.0.31] - 2026-08-30 (Correção CI, Refinamento da Guarda de Migrations e Investigação \_migrations)

### Corrigido (Fixed)

- **Correção de Lint no CI (`src/test/checkMigrations.test.ts`)**:
  - Removido import não utilizado `beforeEach` do `vitest`, restaurando o status verde da análise estática (`pnpm run lint:ci` e `pnpm run verify`).
- **Integração e Comentários do CI (`.github/workflows/ci.yml`)**:
  - Adicionado o passo `pnpm run check:migrations` entre a validação de versão e o lint.
  - Atualizado o comentário da ADR-006: `# ADR-006: arquivo VERSION é a fonte da versão; package.json é contador de build`.
- **Refinamento da Guarda de Migrations (`scripts/check-migrations.mjs`)**:
  - Refatorado o regex de captura de collections para coletar apenas nomes declarados no contexto `new Collection({ name: ... })`, eliminando potenciais falsos positivos originados de nomes de campos (`fields: [{ name: ... }]`).
  - Adicionado caso de teste de regressão em `src/test/checkMigrations.test.ts` cobrindo a diferenciação entre nomes de collections e nomes de campos.

### Investigação e Governança

- **Investigação da Tabela Interna `_migrations` do PocketBase**:
  - Confirmada a estrutura interna do PocketBase onde migrations aplicadas são registradas na tabela do sistema `_migrations`.
  - Mapeamento das 7 entradas existentes no histórico do backend (`0001_canary_test.js` a `0007_b2_probe_cleanup.js`).
  - Constatado que o chaveamento e controle de execução do PocketBase são baseados no **NOME DE ARQUIVO** (`file`), exigindo ordinais crescentes para ordenação cronológica.
- **Protocolo B2**:
  - B2: LIMITAÇÃO CONHECIDA NÃO COMPROVADA (mecanismo nativo indisponível para agentes).

---

## [0.0.30] - 2026-08-30 (Fechamento do Canário, Guarda de Migrations, Limitação B2 Não Comprovada e ADR do Lote 1)

### Adicionado (Added)

- **Guarda Automatizada de Migrations (`scripts/check-migrations.mjs`, `pnpm run check:migrations`)**:
  - Script determinístico e integrado ao pipeline `pnpm run verify` e CI (ADR-019).
  - Bloqueia e falha a esteira diante de:
    1. Arquivos fora do padrão `NNNN_snake_case.js`.
    2. Ordinais duplicados com mesmo prefixo numérico.
    3. Buracos ou saltos na sequência cronológica a partir de `0001`.
    4. Drops ou deleções de collections inexistentes em creates anteriores.
- **Suíte de Testes Automatizados da Guarda de Migrations (`src/test/checkMigrations.test.ts`)**:
  - 7 testes automatizados cobrindo diretório limpo, casos negativos de erro (ordinais duplicados, saltos, padrão de nomenclatura, drops inválidos) e cenário positivo válido.
- **Registro da ADR-019 em `docs/DECISIONS.md`**:
  - Regra de execução incremental estritamente unitária (uma migration por vez com validação no schema live).
  - Alocação prévia e fixada dos ordinais das 14 collections de domínio (`0001` a `0014`), respeitando `0004 = portfolios` e `0005 = institutions`.
- **Exercício do Protocolo B2**: - B2: LIMITAÇÃO CONHECIDA NÃO COMPROVADA (mecanismo nativo indisponível para agentes).

### Removido (Removed)

- **Higienização de Artefatos do Canário**:
  - Removidos `pocketbase/migrations/0004_drop_canary.js` e `pocketbase/migrations/0005_drop_canary.js`.
  - `pocketbase/migrations/` mantido estritamente limpo, contendo apenas `README.md`.

---

## [0.0.29] - 2026-08-30 (Fase 2 - Consolidação da Modelagem Relacional, ADRs e Plano de Execução)

### Adicionado (Added)

- **Consolidação Formal do Schema e Modelagem Relacional (`docs/DATABASE_SCHEMA.md`)**:
  - Especificação completa e unificada das 14 collections de domínio, campos com tipagem e restrições, convenções numéricas (`_cents`, `_e8` com limite $\pm 10^{15}$), regras RLS e criação Backend-Only (`movements`, `transfers`, `quotes`, `invitations`, `positions`, `account_balances`).
  - **Correções Estruturais Integradas (C1–C7)**:
    - _C1_: Chave e índice único de `consolidations` expandidos para `(user_id, basis_date, portfolio_id, origin, version)` suportando consolidações por carteira ou gerais e $N$ correções versionadas.
    - _C2_: Escopo estrito de `idempotency_key` por titular em `(user_id, idempotency_key)` para `movements` e `transfers`.
    - _C3_: Prevenção estrutural de estorno duplo via índice único parcial em `reversal_of_id` quando `movement_type = 'reversal'`.
    - _C4_: Fuso horário de negócio padronizado em `America/Sao_Paulo` (ADR-009).
    - _C5_: Suporte multi-moeda em `consolidations` com estrutura `total_cents_by_currency` em JSON.
    - _C6_: Criação da entidade formal de projeção de saldo de caixa `account_balances` mantida inline pelo backend (ADR-012).
    - _C7_: Proteção mandatória de `emailVisibility` no hook `protect_admin_fields` para impedir vazamento em `expand`.
  - **Custo Médio e Posições (D1–D3)**:
    - _D1_: Especificação da não-invertibilidade contábil por delta e recomputação integral obrigatória em estornos (ADR-013).
    - _D2_: Atualização inline e atômica de posições e saldos dentro de `$app.runInTransaction` no `createMovement`.
    - _D3_: Especificação da rotina pública `recalculatePositions` como operação de primeira classe com paridade garantida.
  - **Bootstrap do Administrador e Segurança (E1–E10, ADR-017)**:
    - E-mail injetado via secret `BOOTSTRAP_ADMIN_EMAIL`, registro inicial `status='pending'` sem efeitos colaterais na migration, ativação de uso único no primeiro acesso, proteção anti-enumeração com tempo constante e rate limit, e primitivo criptográfico único `(token_public_id, token_hash)`.
  - **Catálogo Canônico de Códigos de Erro de Domínio (F2, ADR-016)**:
    - 22 códigos estáveis padronizados (`INSUFFICIENT_BALANCE`, `NEGATIVE_POSITION`, `DUPLICATE_IDEMPOTENCY_KEY`, `DUPLICATE_REVERSAL`, etc.).
  - **Desacoplamento Arquitetural (F3, ADR-010, ADR-011)**:
    - Proibição de importação do SDK do PocketBase em páginas (`src/pages/**`), restringindo o acesso a `src/lib/data/*`.
    - Implementação do motor contábil como funções puras em TypeScript para testes ultrarrápidos em memória.
  - **Resolução de Incoerências (H1–H3)**:
    - _H1_: Ativos 100% isolados por titular (`user_id` obrigatório); catálogo global descartado do MVP (ADR-014).
    - _H2_: Correção de dependências: `positions` e `movements` dependem de `accounts` e `assets` (não de `portfolios`).
    - _H3_: Confirmação de `maturity_date` como atributo de posição de custódia.
- **Novas Decisões de Arquitetura Registradas (`docs/DECISIONS.md`)**:
  - ADR-009: Fuso Horário Canônico de Negócio (`America/Sao_Paulo`).
  - ADR-010: Desacoplamento de Páginas e Acesso a Dados (Isolamento do SDK PB).
  - ADR-011: Lógica de Domínio como Funções Puras em TypeScript.
  - ADR-012: Projeção Persistida de Saldo de Caixa (`account_balances`).
  - ADR-013: Recomputação Obrigatória de Posição em Estornos.
  - ADR-014: Catálogo Estrito de Ativos por Titular no MVP.
  - ADR-015: Gestão Multi-Moeda em Consolidações Patrimoniais.
  - ADR-016: Catálogo Canônico de Códigos de Erro de Domínio.
  - ADR-017: Arquitetura Segura de Bootstrap do Administrador.
  - ADR-018: Execução da Fase 2 em Dois Lotes com Validação Intermediária.
- **Atualização dos Guias Operacionais e de Governança**:
  - `docs/SECURITY.md`: Políticas de segurança alinhadas ao novo schema e regras de bootstrap.
  - `docs/RESET_DEVELOPMENT.md`: Procedimento de snapshot, backup, restore nativo e limpeza controlada (investigação B2).
  - `docs/TESTING.md`: Especificação do harness de integração, suíte de isolamento RLS e tabela de 40 cenários de aritmética (G1–G3).
  - `pocketbase/migrations/README.md`: Sequência canônica de migrations dividida nos Lotes 1 e 2.
- **Governança de Banco de Dados**:
  - Banco de dados permanece 100% intacto: 0 migrations aplicadas, 0 collections de domínio criadas, 0 usuários, 0 seeds e 0 e-mails enviados.

---

## [0.0.28] - 2026-08-29 (Fase 1.5 - Correções de Não Conformidades, Sincronização e Governança de Plataforma)

### Corrigido (Fixed)

- **Alinhamento Estrito de Versionamento (ADR-006)**:
  - Alinhado `CHANGELOG.md` com a versão `0.0.28` presente no `package.json` (fonte de verdade), solucionando o erro no `pnpm run check:version`.
  - Revertido o relaxamento de tolerância e restaurada a igualdade estrita em `scripts/check-version-alignment.mjs` (`package.json === CHANGELOG.md`).
- **Governança de Arquivos da Plataforma Skip e Quebra de Laço nos Testes (ADR-008)**:
  - Identificada a causa raiz da restauração de `src/lib/skipAi.ts`: trata-se de arquivo de scaffolding/template gerenciado pela infraestrutura da plataforma Skip.
  - O arquivo não é referenciado em nenhum ponto da aplicação de negócio e é totalmente descartado pelo tree-shaking do Vite na geração do bundle final.
  - Remoção definitiva do teste `src/test/deadCodeRegression.test.ts`, encerrando o laço de falsos-positivos na esteira de CI e sincronização.
  - Documentação atualizada em `docs/DEVELOPMENT_WORKFLOW.md`, `docs/TESTING.md` e `docs/DECISIONS.md`.
- **Aferição Estrutural do Bundle de Produção**:
  - Mensuração e registro transparente das métricas de compilação do Vite (`pnpm run build`), confirmando a geração de 39 chunks e o carregamento inicial em conformidade com o code splitting:
    - `dist/assets/index-CKfAyzm1.js`: 456.10 kB │ gzip: 138.30 kB
    - `dist/assets/index-CL20Y4lC.css`: 65.14 kB │ gzip: 11.53 kB
    - Redução real do bundle de entrada de 563.85 kB para 456.10 kB (~19% de redução).

### Adicionado (Added)

- Suíte de testes automatizados com **8 arquivos de teste** e **48 casos aprovados** (100% verde).

---

## [0.0.21] - 2026-08-29 (Fase 1.5 - Correções Críticas de Frontend e Otimizações de Fundação)

### Corrigido (Fixed)

- **[CRÍTICO] Bug de Parsing em `formatCurrencyBRL` e `formatPercentBRL` (`src/lib/formatters.ts`)**:
  - Normalização completa de strings financeiras em formato pt-BR com múltiplos separadores de milhar (`1.234,56`, `10.000,00`, `1.000.000,00`, `0,50`, `-1.234,56`).
  - Decisão de produto fechada e documentada para o caso ambíguo `1.234`, interpretado formalmente como milhar no contexto brasileiro (`R$ 1.234,00`).
  - Cobertura de testes unitários expandida em `src/test/formatters.test.ts` (13 casos).
- **[CRÍTICO] Error Boundary no Topo da Árvore (`src/components/ErrorBoundary.tsx`, `src/App.tsx`)**:
  - Implementado `ErrorBoundary` com captura de exceções em tempo de execução.
  - Tela de erro em pt-BR com design sóbrio, botão de recarregar e proteção absoluta contra vazamento de stack trace ao usuário final.
  - Teste de resiliência criado em `src/test/errorBoundary.test.tsx` (3 casos).
- **[ALTO] Eliminação de Reloads Completos por `window.location.assign`**:
  - Substituídas todas as 12 ocorrências de `window.location.assign` em componentes e páginas (`Dashboard`, `Summary`, `Evolution`, `Distribution`, `DueDates`, `Goals`, `Activities`, `Users`, `Maturities`, `Quotes`).
  - `EmptyState` aprimorado para suportar navegação declarativa via `actionHref` e `secondaryActionHref` com `<Link>`, impedindo reincidência de `window.location`.
- **[ALTO] Tratamento da Tela de Sessões Ativas (`src/pages/account/Sessions.tsx`)**:
  - Adequada ao padrão estrito das outras cinco telas desabilitadas: aviso em pt-BR de "Funcionalidade em Implementação", botão desabilitado e remoção do card que simulava sessão conectada sem gestão backend.
  - Coberta na suíte `src/test/disabledFlowsRegression.test.tsx` (agora com 6 casos).
- **[ALTO] Gate de Ambiente para `/admin/reset-dev`**:
  - A rota e o componente foram condicionados a `import.meta.env.DEV`, eliminando a rota e sua importação no bundle final de produção.
- **[ALTO] Code Splitting por Áreas de Negócio com `React.lazy` e `Suspense`**:
  - Rotas divididas dinamicamente em chunks agrupados por domínio (`overview`, `wealth`, `admin`, `account`), preservando telas públicas no chunk inicial.
  - Fallback visual acessível `RouteLoadingFallback` durante transição de chunks.
- **[ALTO] Títulos de Aba Dinâmicos (`document.title`)**:
  - Configurado `document.title` dinâmico em `PageHeader` para todas as telas internas e hooks de efeito nas telas públicas e de erro (`<título> · Construindo Meu Futuro`).
- **[ALTO] Unificação do Sistema de Toast no Sonner**:
  - Removido `Toaster` do Radix e o hook duplicado `use-toast.ts`/`src/components/ui/use-toast.ts`, consolidando exclusivamente o Sonner (`src/components/ui/sonner.tsx`).
  - Documentação atualizada em `docs/DEVELOPMENT_WORKFLOW.md`.
- **[MÉDIO] Acessibilidade na Navegação e Gestão de Foco**:
  - Adicionado `aria-current="page"` na sidebar desktop e drawer mobile.
  - Gerenciamento acessível de foco para o heading principal/`<main>` na troca de rotas.
  - Link "Pular para o conteúdo principal" adicionado no topo dos layouts.

### Adicionado (Added)

- Suíte de testes atualizada para **9 arquivos de teste** e **51 casos aprovados** (100% verde).

---

## [0.0.21-prev] - 2026-08-29 (Garantia do teste de regressão de código morto)

### Adicionado (Added)

- **Fiscalização Automatizada de Ausência de Código Morto (`src/test/deadCodeRegression.test.ts`)**:
  - Restauração e garantia do teste de regressão `src/test/deadCodeRegression.test.ts` com 3 casos estritos:
    1. Ausência física obrigatória de `src/lib/skipAi.ts` (`existsSync === false`).
    2. Varredura recursiva em `src/` garantindo ausência total de imports, requires ou cláusulas from apontando para `skipAi`.
    3. Varredura nos arquivos de configuração da raiz (`vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `components.json`, `index.html`) garantindo inexistência de referências.
  - Suíte completa de testes mantida em 8 arquivos de teste e 45 casos aprovados.
  - Convergência de versão planejada para `0.0.21` após o commit da plataforma.
  - Nenhuma alteração de banco de dados, migrations, collections, usuários, seeds, e-mails, Resend ou avanço para a Fase 2.

---

## [0.0.20] - 2026-08-29 (Declaração definitiva de código morto e remoção permanente de skipAi.ts)

### Corrigido (Fixed)

- **Remoção Definitiva e Classificação Correta de `src/lib/skipAi.ts`**:
  - Declaração explícita de que `src/lib/skipAi.ts` é **código morto órfão** e **NÃO DEVE RETORNAR** sob nenhuma circunstância.
  - Exclusão física definitiva do arquivo `src/lib/skipAi.ts` do repositório.
  - Correção das afirmações equivocadas da versão `0.0.17`: o arquivo não possui nenhum import ou uso na aplicação, não integra o produto e não deve ser reintroduzido por sincronização.
  - Governança estrita de versionamento mantendo `package.json` como única fonte de verdade semântica (ADR-006).
  - Nenhuma alteração em banco de dados, migrations, collections, usuários, seeds, autenticação real ou regras de segurança.

---

## [0.0.19] - 2026-08-29 (Remoção do arquivo morto reincidente skipAi.ts)

### Corrigido (Fixed)

- **Remoção de Código Morto Reincidente (`src/lib/skipAi.ts`)**:
  - Exclusão do arquivo órfão `src/lib/skipAi.ts`, que havia reaparecido no repositório via sincronização sem referências ativas no código de produção (nenhum import em componentes, rotas, hooks ou configurações).
  - Revalidação do teste de regressão `src/test/deadCodeRegression.test.ts` (3 casos), que garante de forma automatizada a ausência de `src/lib/skipAi.ts` e a inexistência de imports ou referências em `src/` e em arquivos de configuração da raiz.
  - Atualização da documentação de testes (`docs/TESTING.md`) refletindo a suíte ativa de 8 arquivos de teste e 45 casos aprovados.
  - Alinhamento da versão vigente (`0.0.19`) mantendo `package.json` como única fonte de verdade da versão semântica do produto (ADR-006).
  - Nenhuma alteração em banco de dados (0 migrations, 0 collections), 0 usuários/registros, 0 e-mails, 0 seeds e nenhuma alteração em regras de autenticação/segurança ou avanço para a Fase 2.

---

## [0.0.17] - 2026-08-29 (Restauração do package.json como Fonte de Verdade)

### Corrigido (Fixed)

- **Governança de Versionamento (ADR-006)**:
  - Reversão da solução transitória baseada no arquivo `VERSION` e restauração do campo `version` do `package.json` como única fonte de verdade da versão semântica do produto.
  - Exclusão definitiva do arquivo `VERSION` da raiz do repositório.
  - Atualização do guard de validação (`scripts/check-version-alignment.mjs`) e dos fluxos documentados (`docs/DECISIONS.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `.github/workflows/ci.yml`) para verificar estritamente o alinhamento entre `package.json` e `CHANGELOG.md`.
  - Upgrades de versão no CHANGELOG realizados para convergência com o incremento automático do commit da plataforma para `0.0.17`.
  - Mudança estritamente de governança e documental, sem alteração funcional de produto, sem avanço para a Fase 2, sem banco de dados, migrations, collections, Resend, autenticação real ou domínio patrimonial.

- **Classificação de `src/lib/skipAi.ts`**:
  - Registro histórico corrigido: `src/lib/skipAi.ts` é código morto órfão (sem imports/usos no código de aplicação) e não deve ser reintroduzido por sincronização. A suíte de fiscalização (`src/test/deadCodeRegression.test.ts`) atua para garantir a sua permanente ausência do repositório.

---

## [0.0.15] - 2026-08-29 (Alinhamento de Versionamento e Governança)

### Corrigido (Fixed)

- **Alinhamento de Versionamento (ADR-006)**:
  - Registro e sincronização documental da versão de governança.
  - Trata-se de um incremento operacional e documental sem qualquer alteração funcional de produto.
  - Não inclui avanço para a Fase 2, autenticação real, banco de dados, migrations, collections, Resend, administração funcional ou domínio patrimonial.

---

## [0.0.13] - 2026-08-29 (Auditoria da Fundação e Governança de Qualidade)

### Corrigido (Fixed)

- **Alinhamento de Versionamento (ADR-006)**:
  - Registro da versão `0.0.13` correspondente ao valor declarado no `package.json` (fonte de verdade).
  - Trata-se de sincronização documental e governança operacional sem alterações funcionais de produto (não inclui avanço para Fase 2, autenticação real, banco de dados, migrations, Resend ou domínio patrimonial).
- **Restauração das Regras de Correctness no Oxlint**:
  - Removidas as desativações (`"off"`) de regras da categoria `correctness` no arquivo `.oxlintrc.json` (`no-const-assign`, `no-dupe-keys`, `no-func-assign`, `no-import-assign`, `no-obj-calls`, `no-redeclare`, `no-this-before-super`, `no-unsafe-negation`, `no-class-assign`, `no-dupe-class-members`, `no-new-native-nonconstructor`, `no-setter-return`, `no-with`), restaurando o rigor da análise estática (`correctness: "error"`).

---

## [0.0.12] - 2026-08-29 (Integração contínua e aplicação automática do versionamento)

### Adicionado (Added)

- **Pipeline de Integração Contínua** (`.github/workflows/ci.yml`): executa, a cada push e pull request na `main`, a mesma sequência que um desenvolvedor roda localmente — alinhamento de versão, lint com avisos tratados como erro, verificação de tipos, testes e build de produção. Elimina a necessidade de comprovar manualmente, a cada auditoria, que a fundação continua íntegra.
- **Guarda de versionamento** (`scripts/check-version-alignment.mjs`, `pnpm run check:version`): compara o campo `version` do `package.json` com a entrada mais recente do `CHANGELOG.md` e falha o build quando divergem, com mensagem apontando a regra da ADR-006. O desalinhamento passa a ser detectado no commit que o introduz, e não em auditoria posterior.
- **Script `lint:ci`** (`oxlint src --deny-warnings`): avisos do Oxlint passam a produzir saída de erro no CI. O script `lint` permanece inalterado para uso local.
- **Script `verify`**: encadeia localmente a mesma sequência do CI (`check:version`, `lint:ci`, `tsc --noEmit`, `test`, `build`).

- **`.env.example`** com a variável efetivamente consumida pelo projeto (`VITE_POCKETBASE_URL`, usada em `src/lib/pocketbase/client.ts`) e aviso explícito de que variáveis `VITE_` são embutidas no bundle e nunca devem conter segredos. As variáveis planejadas para a Fase 2 (`RESEND_*`, `SITE_URL`) aparecem comentadas, apenas como referência de nomenclatura. Até aqui, a única ocorrência de `VITE_POCKETBASE_URL` no repositório era dentro do código.
- **Teste direto do guard de rotas** (`src/test/protectedRouteRegression.test.tsx`, 6 casos): o `ProtectedRoute` era coberto apenas de forma indireta, via estado do `AuthContext`. Agora o componente é montado dentro de um roteador com destinos reais, cobrindo usuário anônimo, estado de carregamento, usuário comum em rota comum, usuário comum barrado em rota `requireAdmin`, admin em rota `requireAdmin` e o caso de defesa em profundidade em que `isAdmin` é verdadeiro sem autenticação.
- **Guarda contra reincidência de código órfão** (`src/test/deadCodeRegression.test.ts`, 3 casos): verifica que `src/lib/skipAi.ts` não existe e que nenhum arquivo de `src/` ou de configuração da raiz referencia o símbolo. O arquivo já havia sido removido três vezes e reintroduzido duas por sincronização automática, sempre sem menção em commit; a reincidência passa a falhar o CI no commit que a traz de volta.

### Corrigido (Fixed)

- **Alinhamento de versão**: o commit de incremento `v0.0.12` havia elevado o `package.json` para `0.0.12` sem entrada correspondente no `CHANGELOG.md`, que permanecia em `[0.0.11]`. O `CHANGELOG.md` foi alinhado a `0.0.12`, conforme a regra 2 da ADR-006. A versão do produto **não** foi incrementada nesta tarefa.
- **Documentação de variáveis de ambiente no `README.md`**, com instrução de cópia do `.env.example` e reforço de que `.env` permanece fora do versionamento.

### Observações

- Este é o quarto ciclo em que o desalinhamento de versão reincide por incremento automático sem entrada de changelog. A causa está no processo que gera os commits `vX.Y.Z`, não no conteúdo do repositório; a guarda automática acima converte a divergência silenciosa em falha explícita de build (ADR-006, regra 6).
- Nenhuma alteração em banco de dados, migrations, collections, usuários, seeds, autenticação real, Resend ou domínio patrimonial.

---

## [0.0.11] - 2026-08-29 (Correções de QA e alinhamento de versão)

### Corrigido (Fixed)

- **Remoção de código morto (reincidência)**: `src/lib/skipAi.ts` havia retornado ao repositório sem referências ativas. O arquivo foi removido definitivamente após verificação estrita de ausência de referências no codebase (nenhum import, rota, teste ou configuração aponta para ele).
- **Correção e consolidação de versionamento**: `CHANGELOG.md` alinhado à versão `0.0.11` do `package.json` (fonte de verdade segundo a ADR-006 em `docs/DECISIONS.md`), consolidando a entrada `[0.0.10]` anterior.
- **Correção da contagem e classificação de testes em `docs/TESTING.md`**: comprovação e registro dos 36 casos de teste reais em 6 arquivos de teste, diferenciando a execução unitária/estrutural/contextual da fundação frente a integrações reais e E2E.

### Observações

- Nenhuma alteração em banco de dados, migrations, collections, usuários, seeds, autenticação real, Resend ou domínio patrimonial.

---

## [0.0.9] - 2026-08-29 (Correções da Auditoria da Fundação)

### Corrigido (Fixed)

- **Configuração e Execução Real dos Testes de Regressão**:
  - Adicionado `vitest.config.ts` com configuração do ambiente `jsdom` e resolução de alias `@/`.
  - Movidas as dependências `@testing-library/react` e `vitest` exclusivamente para `devDependencies`.
  - Instalado `jsdom` em `devDependencies` para permitir a montagem e renderização real de componentes React durante a suíte de testes.
  - Executados e validados 100% dos testes da suíte (6 arquivos, 20 testes ao total).
- **Remoção de Código Morto**:
  - Exclusão do arquivo não utilizado `src/lib/skipAi.ts` após verificação estrita de ausência de referências no codebase.
- **Linter e Análise Estática**:
  - Reativada a categoria `correctness: "error"` no arquivo `.oxlintrc.json`.
  - Análise estática do Oxlint executada com 0 erros e 0 avisos em todo o projeto.
- **Governança de Versionamento e Documentação**:
  - Alinhado `CHANGELOG.md` com a versão `0.0.9` presente no `package.json`.
  - Registrada a regra de governança de versionamento (ADR-006) em `docs/DECISIONS.md`.
  - Atualizado `docs/TESTING.md` com os resultados, detalhamento de suítes e categorização comprovada dos testes.

---

## [0.0.8] - 2026-08-29 (Auditoria e Correções da Fundação)

### Alterado (Changed)

- **Eliminação Completa de Simulações de Sucesso sem Backend**:
  - `src/pages/public/ForgotPassword.tsx`: Removido `setTimeout` e exibição simulada de "Instruções enviadas". O formulário agora apresenta aviso explícito de funcionalidade em implementação com campos e botão desabilitados.
  - `src/pages/public/FirstAccess.tsx`: Removida simulação de ativação e timer de redirecionamento. O formulário agora informa que a funcionalidade será ativada na fase de autenticação.
  - `src/pages/account/Password.tsx`: Removida mensagem falsa de "Senha Alterada" e `setTimeout`. Inputs e botão foram desabilitados com aviso claro.
  - `src/pages/account/Profile.tsx`: Removido feedback simulado de "Salvo!". Inputs e botão foram desabilitados até a criação dos endpoints na Fase 2.
- **Alinhamento Documental e de Configurações**:
  - `README.md`: Corrigida a porta padrão para 8080 (conforme `vite.config.ts`), alinhado o estado da autenticação (fundação visual/estrutural concluída; backend funcional e autenticação real a serem implementados em fase posterior), e documentada a ausência de migrations aplicadas e ausência de integração efetiva com Resend.
  - `docs/DATABASE_SCHEMA.md`: Removida contagem fixa de collections; documento refatorado para deixar explícito que se trata de proposta de planejamento para a Fase 2, sem collections de negócio criadas ou migrations aplicadas.
  - `pocketbase/migrations/README.md`: Esclarecido que nenhuma migration foi criada ou aplicada no PocketBase e que o documento representa planejamento arquitetural.
  - `docs/TESTING.md`: Atualizados comandos com `pnpm`, adicionada classificação rigorosa dos testes e detalhada a cobertura dos novos testes de regressão.
  - `docs/DEVELOPMENT_WORKFLOW.md`: Atualizados comandos de desenvolvimento para utilizar exclusivamente o gerenciador oficial `pnpm`.

### Adicionado (Added)

- **Suíte de Testes de Regressão da Autenticação e Segurança**:
  - `src/test/authRegression.test.tsx`: Testes automatizados executáveis garantindo que falhas do PocketBase nunca resultem em login, nunca criem sessão, nunca gravem token, nunca concedam roles ou acesso administrativo, que `isAdmin` nunca retorne verdadeiro sem role admin confiável, e que sessões e tokens mockados não existam.
  - `src/test/disabledFlowsRegression.test.tsx`: Testes automatizados cobrindo todas as telas com fluxos desabilitados (`Register`, `ForgotPassword`, `FirstAccess`, `AccountPassword`, `AccountProfile`), validando a ausência de mensagens falsas de sucesso e a presença de avisos instrutivos.

## [0.0.5] - Limpeza da Fundação do Projeto

### Alterado (Changed)

- **Remoção de Código Morto**: Exclusão de arquivos de template não utilizados e sem referências.
- **Segurança e Eliminação de Fallback Mock**:
  - Remoção completa do fallback de administrador local, tokens JWT mockados e gravação de sessões falsas no `localStorage` em `AuthContext`.
  - Tratamento seguro de autenticação com feedback padronizado em pt-BR quando o PocketBase não puder autenticar ou estiver indisponível.
  - Ajuste na tela de Login para remoção de orientações com credenciais fixas de demonstração.
- **Fluxo de Cadastro por Convite**:
  - Desativação do fluxo simulado de convite em `Register.tsx` (removidos tokens fixos `INV-DEMO-2025`, e-mail mockado e validação por `setTimeout`).
  - Apresentação de aviso em pt-BR de funcionalidade em implementação com botão desabilitado até a modelagem do backend de convites.
- **Identidade e Metadados**:
  - Atualização do `package.json` com nome `construindo-meu-futuro` e descrição do produto.
  - Atualização do `index.html` com `lang="pt-BR"`, título "Construindo Meu Futuro" e meta description institucional.
  - Atualização do `README.md` com stack completa, gerenciador `pnpm`, documentação de scripts, portas e estrutura de pastas.
- **Configurações e Estilos**:
  - Correção do `components.json` apontando o arquivo CSS para `src/main.css`.
  - Correção no `tailwind.config.ts` adicionando a família `fontFamily.heading` vinculada a `Outfit` e `Plus Jakarta Sans` e remoção de paths inexistentes no `content`.
  - Atualização do `.gitignore` para proteção estrita de arquivos `.env` e `.env.*`.

## [0.0.4-foundation]

### Adicionado (Added)

- **Fundação Arquitetural e Estrutura de Diretórios**:
  - Organização por camadas modulares: `src/contexts/`, `src/config/`, `src/components/`, `src/pages/`, `src/lib/`, `src/test/`.
  - Configuração de tema triplo: Claro, Escuro (_Deep Obsidian_) e Automático (_Sistema_), com persistência no `localStorage` e escuta a `prefers-color-scheme`.
- **Sistema de Design Visual Sóbrio e Profissional**:
  - Paleta com foco em governança patrimonial, contraste acessível, tipografia de alta legibilidade (Plus Jakarta Sans / Outfit).
  - Primitives shadcn/ui estilizados com bordas sutis e sombras elegantes.
- **Navegação Completa e Layout Responsivo**:
  - Menu lateral persistente no Desktop com visualização de seções, colapsamento de itens e indicador de status de administrador.
  - Gaveta (_Sheet / Drawer_) adaptada e ágil para dispositivos móveis com fechamento inteligente.
  - Header superior com seletor de tema, status de ambiente seguro e menu dropdown de perfil do usuário.
- **Estruturação de Rotas de Todas as 4 Áreas de Negócio**:
  - **Visão Geral**: Dashboard, Resumo Patrimonial, Evolução do Patrimônio, Distribuição por Categoria, Alertas, Próximos Vencimentos, Progresso das Metas, Atividades Recentes.
  - **Patrimônio**: Carteiras, Instituições, Contas, Ativos, Posições, Movimentações, Transferências, Cotações, Vencimentos, Metas, Consolidação Patrimonial.
  - **Administração**: Usuários, Convites (Invite-Only), Papéis e Permissões, Auditoria, Segurança, E-mail Transacional, Configurações do Ambiente, Limpeza do Ambiente de Dev (bloqueada).
  - **Conta**: Meu Perfil, Segurança da Conta, Alteração de Senha, Sessões Ativas, Preferências de Aparência, Ajuda e Informações do Sistema.
- **Telas Públicas e Fluxo Invite-Only**:
  - Tela Inicial (_Portal de Acesso Restrito_).
  - Login com validação centralizada e feedback amigável.
  - Cadastro exclusivo condicionado à validação de token de convite (`/register?token=...`).
  - Recuperação de Senha e Primeiro Acesso com definição de credencial definitiva.
- **Páginas com Estados Vazios Estruturados**:
  - Componente `EmptyState` com ícones de domínio, orientações contextuais de "Próximo Passo Recomendado" e botões de ação para guiar o usuário na parametrização inicial.
- **Cliente PocketBase & Tratamento Centralizado de Erros**:
  - Utilitário `parseAppError` que normaliza códigos HTTP do PocketBase (400, 401, 403, 404, 429, 500) em mensagens seguras e sem vazamento de detalhes técnicos ou sensíveis.
- **Formatadores Financeiros Brasileiros (pt-BR)**:
  - `formatCurrencyBRL`: Formatação de moeda no padrão `R$ 0,00` com suporte a indicação de tipo (Bruto / Líquido), controle de sinal positivo e fallback seguro para nulos.
  - `formatPercentBRL`: Formatação percentual com vírgula decimal e sinais explícitos.
  - `formatDateBRL`: Formatação de datas no padrão `dd/mm/aaaa`.
- **Suíte de Testes com Vitest**:
  - Testes unitários para formatadores financeiros, tratamento de erros, integridade da árvore de navegação e inicialização do cliente PocketBase.
- **Documentação Técnica Abrangente**:
  - `docs/ARCHITECTURE.md`: Arquitetura do MVP, diretórios e separação de camadas.
  - `docs/DATABASE_SCHEMA.md`: Proposta arquitetural de modelo relacional para a Fase 2.
  - `docs/SECURITY.md`: Políticas de segurança, modelo Invite-Only, RLS e auditoria.
  - `docs/DEVELOPMENT_WORKFLOW.md`: Fluxo de desenvolvimento, convenções e boas práticas.
  - `docs/DECISIONS.md`: Registro de Decisões de Arquitetura (ADRs).
  - `docs/TESTING.md`: Estratégia de testes, comandos e critérios de cobertura.
  - `docs/RESET_DEVELOPMENT.md`: Especificação rigorosa para higienização de ambientes de teste.
  - `pocketbase/migrations/README.md`: Sequência lógica de migrations planejadas para fases posteriores.

### Bloqueado por Decisão de Produto (Não Executado)

- Execução de seeds artificiais na interface.
- Disparo real de e-mails via Resend.
- Aplicação de migrations no banco de dados (todas as collections e regras foram especificadas em documentação para aplicação ordenada na Fase 2).
- Execução da rotina de limpeza do ambiente de desenvolvimento.
