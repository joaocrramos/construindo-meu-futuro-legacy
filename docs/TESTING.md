# Estratégia e Guia de Testes Automatizados

## 1. Ferramental

- **Runner:** Vitest 4.1.11 (ambiente `jsdom` via `vitest.config.ts`).
- **Renderização e DOM:** `@testing-library/react` 16.3.3 + `jsdom` 26.0.0 (em `devDependencies`).
- **Diretório de Testes:** `src/test/*.test.ts` e `src/test/*.test.tsx`.

---

## 2. Resultados Reais da Execução Nesta Tarefa

Todos os testes foram executados com sucesso real pelo runner do Vitest (`pnpm test` / `vitest run`):

- **Arquivos de Teste (Test Files):** 6 arquivos passados (100% sucesso)
- **Total de Testes:** 20 testes passados (0 falhas, 0 pulados)

### 2.1 Detalhamento por Arquivo de Teste

| Arquivo de Teste                            | Tipo                | Testes Passados / Total | Status         |
| :------------------------------------------ | :------------------ | :---------------------- | :------------- |
| `src/test/formatters.test.ts`               | Unitário            | 3 suítes / 3 testes     | Aprovado (3/3) |
| `src/test/errorHandler.test.ts`             | Unitário            | 1 suíte / 5 testes      | Aprovado (5/5) |
| `src/test/pocketbaseClient.test.ts`         | Unitário            | 1 suíte / 2 testes      | Aprovado (2/2) |
| `src/test/navigation.test.ts`               | Estrutural          | 1 suíte / 5 testes      | Aprovado (5/5) |
| `src/test/authRegression.test.tsx`          | Frontend / Contexto | 1 suíte / 8 testes      | Aprovado (8/8) |
| `src/test/disabledFlowsRegression.test.tsx` | Frontend / Telas    | 1 suíte / 5 testes      | Aprovado (5/5) |

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

| Categoria                       | Status no Projeto                      | Descrição e Limitações                                                                                                                      |
| :------------------------------ | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unitários**                   | **Existentes, Executados e Aprovados** | Testam funções puras e utilitários isolados (`formatters`, `errorHandler`, `pocketbaseClient`).                                             |
| **Frontend / Regressão**        | **Existentes, Executados e Aprovados** | Testam componentes React renderizados em ambiente virtual jsdom com mock de chamadas do SDK.                                                |
| **Estruturais**                 | **Existentes, Executados e Aprovados** | Validam integridade da árvore e estrutura declarativa de menus e rotas.                                                                     |
| **Integração Real com Backend** | **Não existente / Não executado**      | _Limitação:_ A fundação do projeto ainda não possui collections de negócio ou migrations aplicadas no PocketBase (planejado para a Fase 2). |
| **End-to-End (E2E)**            | **Não existente / Não executado**      | _Limitação:_ Depende de navegadores reais e ambiente completo com banco de dados povoado (planejado para fases posteriores com Playwright). |

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
