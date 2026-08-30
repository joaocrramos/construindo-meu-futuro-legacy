# Estratégia e Guia de Testes Automatizados

## 1. Ferramental

- **Runner:** Vitest 4.1.11 (ambiente `jsdom` via `vitest.config.ts`).
- **Renderização e DOM:** `@testing-library/react` 16.3.3 + `jsdom` 26.0.0 (em `devDependencies`).
- **Diretório de Testes:** `src/test/*.test.ts` e `src/test/*.test.tsx`.

---

## 2. Resultados Reais da Última Execução

Números obtidos da saída real do runner (`pnpm test` / `vitest run`), não de estimativa ou contagem manual:

- **Arquivos de Teste (Test Files):** 9 arquivos, 9 aprovados
- **Total de Testes:** **56 testes** — 56 aprovados, 0 falhos, 0 pulados

### 2.1 Detalhamento por Arquivo de Teste

Um arquivo de teste corresponde a um "Test File" no relatório do Vitest. A coluna "Blocos `describe`" conta **todos** os `describe`, inclusive os aninhados — blocos de agrupamento **não** são testes e não devem ser somados à contagem de casos.

| Arquivo de Teste                             | Tipo                   |   Blocos `describe` | Casos `it` | Status |
| :------------------------------------------- | :--------------------- | ------------------: | ---------: | :----- |
| `src/test/authRegression.test.tsx`           | Frontend / Contexto    |                   1 |          8 | 8/8    |
| `src/test/checkMigrations.test.ts`           | Governança / Script    |                   1 |          8 | 8/8    |
| `src/test/disabledFlowsRegression.test.tsx`  | Frontend / Telas       |                   1 |          6 | 6/6    |
| `src/test/errorBoundary.test.tsx`            | Frontend / Resiliência |                   1 |          3 | 3/3    |
| `src/test/errorHandler.test.ts`              | Unitário               |                   1 |          5 | 5/5    |
| `src/test/formatters.test.ts`                | Unitário               | 4 (1 + 3 aninhados) |     **13** | 13/13  |
| `src/test/navigation.test.ts`                | Estrutural             |                   1 |          5 | 5/5    |
| `src/test/pocketbaseClient.test.ts`          | Unitário               |                   1 |          2 | 2/2    |
| `src/test/protectedRouteRegression.test.tsx` | Frontend / Guard       |                   1 |          6 | 6/6    |
| **TOTAL**                                    |                        |              **12** |     **56** | 56/56  |

### 2.2 Como os Testes São Descobertos

- O Vitest é configurado por `vitest.config.ts` na raiz (`environment: 'jsdom'`, `globals: true`, alias `@/` → `./src`).
- Não há `include`/`exclude` customizados: vale o padrão do Vitest, que descobre `**/*.{test,spec}.?(c|m)[jt]s?(x)` em todo o projeto, excluindo `node_modules` e `dist`.
- Na prática, todos os arquivos de teste vivem em `src/test/` com os sufixos `.test.ts` e `.test.tsx`.
- Não existe nenhum `it.skip`, `describe.skip`, `.only` ou `.todo` no projeto — portanto todos os casos declarados são coletados e executados.

---

## 3. Especificação da Infraestrutura de Validação da Fase 2 (G1–G3)

Com o início da execução da Fase 2, serão introduzidos três novos pilares de teste automatizado:

### 3.1 Harness de Teste de Backend e Isolamento (G1 & G2)

- **Harness de Integração:** Mecanismo para provisionar banco descartável/isolado de teste, aplicar as migrations do Lote 1 e executar rotinas de autorização.
- **Suíte de Isolamento RLS:** Teste automatizado com dois usuários autenticados simultâneos (Usuário A e Usuário B).
  - O Usuário A tenta ler, mutar e assinar via realtime (`use-realtime`) registros pertencentes ao Usuário B em todas as collections (`portfolios`, `accounts`, `account_balances`, `assets`, `positions`, `movements`, `transfers`, `wealth_goals`, `consolidations`).
  - O Usuário A tenta consultar via `expand` registros do Usuário B.
  - **Critério de Aprovação:** 100% das tentativas transversais devem ser rejeitadas pelo RLS.

### 3.2 Teste-Tabela de Aritmética Financeira e Custo Médio (G3, ADR-011)

Suíte exaustiva de testes unitários de funções puras com aproximadamente **40 cenários matemáticos e contábeis**, cobrindo:

1. Compra simples à vista.
2. Compra com taxa de corretagem e emolumentos somados ao custo total.
3. Venda parcial com apuração correta de custo proporcional e manutenção do preço médio.
4. Lançamento de proventos (dividendos e JCP com retenção de IR).
5. Despesas avulsas e taxas de custódia.
6. Depósito e retirada de caixa.
7. Transferência entre contas do mesmo titular com taxa.
8. Estorno de compra (recompondo caixa e subtraindo lote de custódia).
9. Estorno de venda (disparando recomputação integral e restaurando o custo médio histórico exato).
10. Sequência mista: Compra A -> Compra B -> Venda Parcial -> Compra C -> Estorno da Venda -> Estorno da Compra B.
11. Bloqueio estrito de posição negativa (rejeição de venda que excede a custódia).
12. Bloqueio estrito de saldo de caixa negativo em conta não autorizada.
13. Deduplicação por `(user_id, idempotency_key)`.
14. Paridade absoluta entre cálculo incremental e recálculo integral (`recalculatePositions`).

---

## 4. Classificação dos Testes do Projeto e Limitações

| Categoria                       | Status e Execução Nesta Tarefa         | Descrição e Limitações                                                                                                                                    |
| :------------------------------ | :------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unitários**                   | **Executados e Aprovados (20 testes)** | Testam funções puras e utilitários isolados (`formatters`: 13, `errorHandler`: 5, `pocketbaseClient`: 2).                                                 |
| **Frontend / Regressão**        | **Executados e Aprovados (23 testes)** | Testam componentes React em jsdom com mock do SDK (`authRegression`: 8, `disabledFlowsRegression`: 6, `protectedRouteRegression`: 6, `errorBoundary`: 3). |
| **Estruturais / Governança**    | **Executados e Aprovados (13 testes)** | Validam a integridade da árvore e integridade estrutural (`navigation`: 5) e integridade de migrations (`checkMigrations`: 8).                            |
| **Integração Real com Backend** | **Não existente / Não executado**      | _Limitação de Evidência:_ A base atual não possui migrations aplicadas ou dados de domínio persistidos. Será implementada no Lote 1 da Fase 2.            |
| **End-to-End (E2E)**            | **Não existente / Não executado**      | _Limitação de Evidência:_ Depende de ambiente com banco de dados povoado e navegadores reais (planejado para etapas posteriores).                         |

---

## 5. Comandos de Execução (pnpm)

Para rodar todos os testes com o runner oficial:

```bash
pnpm test
```

Para rodar a esteira completa de verificação do projeto:

```bash
pnpm run verify
```
