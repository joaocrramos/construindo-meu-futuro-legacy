# Protocolo de Drafts de Migrations (`pocketbase/drafts/`)

Este diretório armazena os rascunhos (*drafts*) de migrations JavaScript do PocketBase (JSVM) durante as etapas de desenvolvimento e revisão, em estrita conformidade com a **ADR-021** e **ADR-019**.

---

## 1. Motivação e Contexto de Risco (ADR-021)

Na infraestrutura atual do Skip Cloud / PocketBase:
- **Não existe ferramenta de rollback** de migration em nenhum conjunto disponível (não há apply/revert; não há função de backend nem hook para desaplicação).
- **O restore de snapshot (B2)** segue não comprovado.
- **A aplicação de migration ocorre sem gate humano** assim que arquivos são colocados em `pocketbase/migrations/`.

**Consequência fundamental:** TODA migration é uma operação **irreversível**. A corretude precisa ser garantida antes de o arquivo chegar em `pocketbase/migrations/`, e não confirmada depois.

---

## 2. Protocolo de Governança

1. **Escrita e Revisão em Drafts:**
   - Novas migrations devem ser criadas e revisadas exclusivamente em `pocketbase/drafts/`.
   - Nenhuma migration deve ser escrita diretamente em `pocketbase/migrations/`.

2. **Aprovação Explícita:**
   - Migrations em `pocketbase/drafts/` só podem ser movidas para `pocketbase/migrations/` após aprovação formal e explícita do código e de sua modelagem.

3. **A Movimentação é o Ato de Aplicar:**
   - A movimentação de um arquivo de `pocketbase/drafts/` para `pocketbase/migrations/` é o ato deliberado de aplicação no banco de dados live.
   - Nenhuma migration irreversível vai para `pocketbase/migrations/` sem essa aprovação prévia.

4. **Nomenclatura e Ordinais:**
   - Os arquivos de draft devem seguir rigorosamente o padrão `NNNN_snake_case.js` conforme alocado na ADR-019.

---

## 3. Critério de Aprovação do Draft

Para assegurar conformidade estrita com a governança da plataforma e mitigar a irreversibilidade de migrations (ADR-021), a aprovação dos drafts segue o protocolo formal detalhado abaixo:

1. **Quem revisa:**
   - O **proprietário do projeto** (responsável técnico da instância).
   - Nenhuma migration pode ser promovida para aplicação sem a revisão e aval explícito do proprietário.

2. **O que é validado em cada item antes da aprovação:**
   - **Conformidade com DATABASE_SCHEMA.md item a item:**
     - Verificação exata de nomes de campos, tipos nativos do PocketBase, atributos obrigatórios/opcionais (`required`, `onlyInt`, `min`, `max`, `values`, `cascadeDelete`).
     - Precisão numérica conforme convenções: quantias escaladas por $10^8$ (`quantity_e8`), valores monetários inteiros em centavos (`_cents`).
     - Existência mandatória dos campos `created` (`onCreate: true, onUpdate: false`) e `updated` (`onCreate: true, onUpdate: true`) do tipo `autodate` em todas as collections base.
     - Índices únicos e compostos aderentes aos declarados na especificação.
   - **Regras de RLS (Row-Level Security) de cada collection:**
     - Definição explícita de todas as 5 regras de acesso: `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`.
     - Isolamento estrito por titular (`user_id = @request.auth.id`).
     - Bloqueio de criação direta pelo cliente nas collections transacionais (`createRule = null` em `invitations`, `audit_logs`, `account_balances`, `positions`, `movements`), garantindo mutação exclusiva via backend e transações atômicas (`runInTransaction`).
   - **Idempotência por construção:**
     - Verificação preventiva de existência de tabelas (`app.hasTable('nome')`) ou tratamento de duplicidade antes da criação.
   - **Down() seguro:**
     - Implementação reversível e defensiva em bloco `try/catch` para remoção controlada de campos adicionados e collections criadas, sem destruir o único caminho de acesso nem apagar tabelas nativas ou não criadas pela própria migration.
   - **Nomenclatura e ordinal pela alocação da ADR-019:**
     - Padrão estrito `NNNN_snake_case.js`.
     - Ordinais contínuos e pré-fixados pela ADR-019 (ex: `0002_create_invitations.js` até `0010_create_movements.js` para o Lote 1).
   - **Ausência de criação de usuários:**
     - Conformidade com a ADR-017 revisada: nenhuma migration pode criar, semear ou mutar registros de usuários em banco. O provisionamento do admin inicial é manual pelo painel de superusuário.
   - **Ausência de dependência de secrets:**
     - Nenhuma migration pode depender de secrets ou variáveis de ambiente para a execução estrutural do schema.
     - Se qualquer migração depender de configuração indispensável ausente, deve lançar erro explícito em vez de se tornar um no-op silencioso.

3. **Gesto de aprovação:**
   - A aprovação ocorre de forma deliberada e formal pelo proprietário.
   - **A movimentação é o ato de aplicar:** após aprovados, os arquivos são movidos do diretório `pocketbase/drafts/` para `pocketbase/migrations/`.
   - Como a plataforma Skip Cloud aplica automaticamente qualquer arquivo adicionado em `pocketbase/migrations/`, a transferência física do arquivo constitui a aplicação no banco live.

---

## 4. Critérios de Revisão e Regras de Frontend

1. **Campos de Data nos Formulários:**
   - Todo futuro formulário ou fluxo com campo de data deve obrigatoriamente usar o componente `DatePicker` reutilizável (`src/components/DatePicker.tsx`, baseado em Calendar + Popover com localização pt-BR).
   - Nenhuma tela deve usar `input type="date"` nativo ou formatação manual ad-hoc de datas.
