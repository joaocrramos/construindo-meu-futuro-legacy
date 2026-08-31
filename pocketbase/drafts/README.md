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
