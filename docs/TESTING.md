# Estratégia e Guia de Testes Automatizados

## 1. Ferramental

- **Runner:** Vitest (execução de testes em ambiente Node/jsdom).
- **Diretório de Testes:** `src/test/*.test.ts` e `src/test/*.test.tsx`.

---

## 2. Cobertura da Fundação MVP

A fundação do sistema conta com testes automatizados executáveis cobrindo os pilares do MVP:

### 2.1 Formatadores Financeiros (`src/test/formatters.test.ts`)

- Formatação de valores positivos em padrão `R$ 0,00` e números na casa de milhões.
- Formatação correta de valores negativos com sinal e espaçamento adequado (`- R$ 450,75`).
- Conversão segura de strings com vírgula ou ponto decimal.
- Tratamento de nulos, strings vazias e `undefined` com fallback seguro (`—`).
- Opção de supressão de símbolo (`showSymbol: false`).
- Sufixo discriminatório de valor `(Bruto)` e `(Líquido)`.
- Formatação percentual com sinal positivo explícito (`+15,42%`) e negativo (`-3,85%`).
- Formatação de datas no padrão pt-BR (`dd/mm/aaaa`).

### 2.2 Tratamento Centralizado de Erros (`src/test/errorHandler.test.ts`)

- Mapeamento de erro HTTP 400 em "Dados inválidos" com extração de mensagens de campos.
- Mapeamento de erro HTTP 401 em "Não autenticado / Sessão expirada".
- Mapeamento de erro HTTP 403 em "Acesso negado" sem expor regras de RLS internas.
- Mapeamento de erro HTTP 500 em "Instabilidade temporária".
- Tratamento de exceções genéricas de rede (`Failed to fetch`).

### 2.3 Matriz de Navegação Estrutural (`src/test/navigation.test.ts`)

- Validação das 4 áreas principais: `overview`, `wealth`, `admin` e `account`.
- Validação de todos os subitens de Visão Geral (Dashboard, Resumo, Evolução, Distribuição, Alertas, Vencimentos, Metas, Atividades).
- Validação dos 11 subitens de Patrimônio (Carteiras, Instituições, Contas, Ativos, Posições, Movimentações, Transferências, Cotações, Vencimentos, Metas, Consolidação).
- Validação de proteção da seção Administração (`requireAdmin: true`).
- Validação de todos os subitens de Conta.

### 2.4 Inicialização do SDK PocketBase (`src/test/pocketbaseClient.test.ts`)

- Exportação correta da instância PocketBase.
- Desativação do cancelamento automático para suporte a requisições concorrentes.

---

## 3. Comandos de Execução

Para rodar todos os testes em modo CI:

```bash
npm test
```

Para rodar em modo contínuo durante o desenvolvimento:

```bash
npm run test:watch
```
