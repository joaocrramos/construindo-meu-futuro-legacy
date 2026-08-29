# Estratégia e Guia de Testes Automatizados

## 1. Ferramental

- **Runner:** Vitest 4.1.11 (ambiente `jsdom` via `vitest.config.ts`).
- **Renderização e DOM:** `@testing-library/react` 16.3.3 + `jsdom` 26.0.0 (em `devDependencies`).
- **Diretório de Testes:** `src/test/*.test.ts` e `src/test/*.test.tsx`.

---

## 2. Resultados Reais da Última Execução

Números obtidos da saída real do runner (`pnpm test` / `vitest run`), não de estimativa ou contagem manual:

- **Arquivos de Teste (Test Files):** 6 arquivos, 6 aprovados
- **Total de Testes:** **36 testes** — 36 aprovados, 0 falhos, 0 pulados

### 2.1 Detalhamento por Arquivo de Teste

Um arquivo de teste corresponde a um "Test File" no relatório do Vitest. A coluna "Blocos `describe`" conta **todos** os `describe`, inclusive os aninhados — blocos de agrupamento **não** são testes e não devem ser somados à contagem de casos.

| Arquivo de Teste                            | Tipo                |   Blocos `describe` | Casos `it` | Status |
| :------------------------------------------ | :------------------ | ------------------: | ---------: | :----- |
| `src/test/formatters.test.ts`               | Unitário            | 4 (1 + 3 aninhados) |     **11** | 11/11  |
| `src/test/errorHandler.test.ts`             | Unitário            |                   1 |          5 | 5/5    |
| `src/test/pocketbaseClient.test.ts`         | Unitário            |                   1 |          2 | 2/2    |
| `src/test/navigation.test.ts`               | Estrutural          |                   1 |          5 | 5/5    |
| `src/test/authRegression.test.tsx`          | Frontend / Contexto |                   1 |          8 | 8/8    |
| `src/test/disabledFlowsRegression.test.tsx` | Frontend / Telas    |                   1 |          5 | 5/5    |
| **TOTAL**                                   |                     |               **9** |     **36** | 36/36  |

### 2.2 Como os Testes São Descobertos

- O Vitest é configurado por `vitest.config.ts` na raiz (`environment: 'jsdom'`, `globals: true`, alias `@/` → `./src`).
- Não há `include`/`exclude` customizados: vale o padrão do Vitest, que descobre `**/*.{test,spec}.?(c|m)[jt]s?(x)` em todo o projeto, excluindo `node_modules` e `dist`.
- Na prática, todos os arquivos de teste vivem em `src/test/` com os sufixos `.test.ts` e `.test.tsx`.
- Não existe nenhum `it.skip`, `describe.skip`, `.only` ou `.todo` no projeto — portanto todos os casos declarados são coletados e executados.

### 2.3 Nota de Correção de Contagem

Versões anteriores deste documento registraram **20 testes**, e atribuíram **3 testes** a `formatters.test.ts`. Ambos os números estavam incorretos:

- `formatters.test.ts` possui **11 casos `it`** distribuídos em 3 `describe` aninhados. O número 3 correspondia aos blocos de agrupamento, não aos testes.
- O total correto é **36**, confirmado pela saída do runner (`Tests 36 passed (36)`).
- Nenhum teste foi adicionado, removido ou renomeado para chegar a esse número: a divergência foi exclusivamente **erro de contagem em relatório anterior**, não perda de descoberta, não mudança de configuração e não diferença entre branches ou entre HEAD local e remoto.

---

## 3. Categorização e Cobertura da Fundação

### 3.1 Formatadores Financeiros (`src/test/formatters.test.ts`) — [Unitário / Frontend]

- Formatação de valores positivos em padrão `R$ 0,00` e números na casa de milhões.
- Formatação correta de valores negativos com sinal e espaçamento adequado (`- R$ 450,75`).
- Conversão segura de strings com vírgula ou ponto decimal.
- Tratamento de nulos, strings vazias e `undefined` com fallback seguro (`—`).
- Opção de supressão de símbolo (`showSymbol: false`).
- Sufixo discriminatório de valor `(Bruto)` e `(Líquido)`.
- Formatação percentual com sinal positivo explícito (`+15,42%`) e negativo (`-3,85%`).
- Formatação de datas no padrão pt-BR (`dd/mm/aaaa`).

### 3.2 Tratamento Centralizado de Erros (`src/test/errorHandler.test.ts`) — [Unitário]

- Mapeamento de erro HTTP 400 em "Dados inválidos" com extração de mensagens de campos.
- Mapeamento de erro HTTP 401 em "Não autenticado / Sessão expirada".
- Mapeamento de erro HTTP 403 em "Acesso negado" sem expor regras de RLS internas.
- Mapeamento de erro HTTP 500 em "Instabilidade temporária".
- Tratamento de exceções genéricas de rede (`Failed to fetch`).

### 3.3 Matriz de Navegação Estrutural (`src/test/navigation.test.ts`) — [Estrutural / Configuração]

- Validação das 4 áreas principais: `overview`, `wealth`, `admin` e `account`.
- Validação de todos os subitens de Visão Geral (Dashboard, Resumo, Evolução, Distribuição, Alertas, Vencimentos, Metas, Atividades).
- Validação dos 11 subitens de Patrimônio (Carteiras, Instituições, Contas, Ativos, Posições, Movimentações, Transferências, Cotações, Vencimentos, Metas, Consolidação).
- Validação de proteção da seção Administração (`requireAdmin: true`).
- Validação de todos os subitens de Conta.

### 3.4 Inicialização do SDK PocketBase (`src/test/pocketbaseClient.test.ts`) — [Unitário]

- Exportação correta da instância PocketBase.
- Desativação do cancelamento automático para suporte a requisições concorrentes.

### 3.5 Regressão de Autenticação e Segurança (`src/test/authRegression.test.tsx`) — [Frontend / Integração de Contexto]

- Falha do PocketBase nunca resulta em login bem-sucedido.
- Falha do PocketBase nunca cria sessão ou popula usuário.
- Falha do PocketBase nunca grava token no store.
- Falha do PocketBase nunca concede role.
- Falha do PocketBase nunca concede acesso administrativo.
- `isAdmin` nunca retorna verdadeiro sem papel administrativo de fonte confiável.
- Senha incorreta nunca resulta em sucesso.
- Ausência de sessão mockada e token fixo no estado inicial.

### 3.6 Regressão de Fluxos Desabilitados (`src/test/disabledFlowsRegression.test.tsx`) — [Frontend / Telas]

- Cadastro por convite (`Register.tsx`) com input desabilitado, botão desabilitado e aviso de implementação.
- Recuperação de senha (`ForgotPassword.tsx`) sem simulação de envio de e-mail e com formulário desabilitado.
- Primeiro acesso (`FirstAccess.tsx`) sem simulação de ativação ou timer de redirecionamento.
- Alteração de senha (`Password.tsx`) com campos desabilitados e sem sucesso simulado.
- Atualização de perfil (`Profile.tsx`) com campos desabilitados e sem mensagem falsa de salvamento.

---

## 4. Classificação dos Testes do Projeto e Limitações

| Categoria                       | Status e Execução Nesta Tarefa         | Descrição e Limitações                                                                                                                      |
| :------------------------------ | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unitários**                   | **Executados e Aprovados (18 testes)** | Testam funções puras e utilitários isolados (`formatters`: 11, `errorHandler`: 5, `pocketbaseClient`: 2).                                   |
| **Frontend / Regressão**        | **Executados e Aprovados (13 testes)** | Testam componentes React em jsdom com mock do SDK (`authRegression`: 8, `disabledFlowsRegression`: 5).                                      |
| **Estruturais**                 | **Executados e Aprovados (5 testes)**  | Validam integridade da árvore e estrutura declarativa de menus e rotas (`navigation`: 5).                                                   |
| **Integração Real com Backend** | **Não existente / Não executado**      | _Limitação:_ A fundação do projeto não possui collections de negócio ou migrations aplicadas no PocketBase (planejado para a Fase 2).       |
| **End-to-End (E2E)**            | **Não existente / Não executado**      | _Limitação:_ Depende de navegadores reais e ambiente completo com banco de dados povoado (planejado para fases posteriores com Playwright). |

### 4.1 Limitações de Cobertura e de Comprovação

- **Os testes são revalidados automaticamente pelo CI** (`.github/workflows/ci.yml`) a cada push e pull request na `main`, junto com alinhamento de versão, lint, tipagem e build. O resultado do CI é a evidência de referência sobre o estado da suíte em um commit — os números da seção 2 devem ser lidos como o retrato da última execução registrada, não como garantia perpétua. Para reproduzir localmente a mesma sequência, use `pnpm run verify`.
- **Autenticação real não é testada** — os testes de regressão usam `vi.spyOn` sobre o SDK do PocketBase e provam apenas que uma falha do backend nunca produz sucesso, sessão, token ou papel. Não existe teste contra um PocketBase real.
- **Não há teste de banco vazio nem de Resend**, porque não existem collections de domínio nem integração de e-mail nesta fase.
- **`ProtectedRoute` é coberto indiretamente**, via estado do `AuthContext`. Não há teste que monte a rota protegida e verifique o redirecionamento.
- **Não há medição de cobertura** (`coverage`) configurada.

---

## 5. Comandos de Execução (pnpm)

Para rodar todos os testes com o runner oficial:

```bash
pnpm test
```

Para rodar em modo contínuo durante o desenvolvimento:

```bash
pnpm run test:watch
```
