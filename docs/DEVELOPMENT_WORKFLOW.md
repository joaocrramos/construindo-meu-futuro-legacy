# Fluxo de Desenvolvimento & Convenções

## 1. Stack Tecnológica Fixa

- **Frontend:** React 19 + Vite 6 + TypeScript + Tailwind CSS 3.
- **Kit de UI:** shadcn/ui completo (`src/components/ui/`) com Radix UI.
- **Backend & Persistência:** PocketBase v0.36 (Skip Cloud) com persistência SQLite e RLS.
- **Linter & Formatador:** oxlint + oxfmt.
- **Testes Automatizados:** Vitest + @testing-library.

---

## 2. Padrões de Código e Nomenclatura

1. **Inglês para Código e Banco:**
   - Variáveis, funções, componentes, props, arquivos `.ts`/`.tsx`.
   - Nomes de collections (`users`, `portfolios`, `positions`, `movements`).
   - Campos de banco (`user_id`, `created`, `ticker`, `average_price`).
2. **Português (pt-BR) para Interface e Negócio:**
   - Todos os rótulos de botões, títulos de páginas, modais, mensagens de validação e toasts.
   - Formatação financeira estritamente em moeda Real (`R$ 1.250,50`) com vírgula para casas decimais e ponto para milhares.
3. **Componentes e Estrutura:**
   - Componentes funcionais com tipagem estrita de interfaces TypeScript.
   - Importações absolutas utilizando alias `@/...` (ex: `import { Button } from '@/components/ui/button'`).

---

## 3. Comandos de Desenvolvimento

| Comando                  | Descrição                                                                     |
| ------------------------ | ----------------------------------------------------------------------------- |
| `pnpm run dev`           | Inicia o servidor local de desenvolvimento (Vite - porta 8080)                |
| `pnpm run build`         | Executa a compilação e bundle de produção com TypeScript                      |
| `pnpm run lint`          | Executa análise estática de código com oxlint                                 |
| `pnpm run lint:fix`      | Corrige problemas automáticos de lint                                         |
| `pnpm run lint:ci`       | Igual ao `lint`, mas trata avisos como erro (usado pelo CI)                   |
| `pnpm test`              | Executa a suíte completa de testes com Vitest                                 |
| `pnpm run test:watch`    | Executa os testes em modo interativo contínuo                                 |
| `pnpm run check:version` | Verifica se `package.json` e `CHANGELOG.md` declaram a mesma versão (ADR-006) |
| `pnpm run verify`        | Roda localmente a mesma sequência do CI: versão, lint, tipos, testes e build  |

---

## 3.1 Integração Contínua

O workflow `.github/workflows/ci.yml` executa, a cada push e pull request na `main`, exatamente a sequência do comando `verify`:

1. `pnpm run check:version` — alinhamento entre `package.json` e `CHANGELOG.md` (ADR-006, regra 6)
2. `pnpm run lint:ci` — Oxlint com avisos tratados como erro
3. `pnpm exec tsc --noEmit` — verificação de tipos
4. `pnpm test` — suíte Vitest
5. `pnpm run build` — build de produção

Conforme a ADR-007, o resultado do CI é a evidência de referência sobre o estado de qualidade de um commit. Antes de abrir um pull request, rode `pnpm run verify` para antecipar as mesmas falhas localmente.

---

## 4. Política de Tratamento de Erros no Frontend

Todo tratamento de exceções de requisição deve passar pelo `parseAppError` (`src/lib/errorHandler.ts`), que transforma status HTTP em mensagens claras e oculta stack traces técnicos:

```typescript
import { parseAppError } from '@/lib/errorHandler'
import { toast } from '@/hooks/use-toast'

try {
  await pb.collection('portfolios').create(data)
} catch (err) {
  const errorDetails = parseAppError(err)
  toast({
    title: errorDetails.title,
    description: errorDetails.message,
    variant: 'destructive',
  })
}
```
