# Protocolo de Limpeza Controlada do Ambiente de Desenvolvimento

> **AVISO DE GOVERNANÇA:** Esta operação está **PERMANENTEMENTE BLOQUEADA** na fundação do MVP. O documento a seguir estabelece as travas de segurança mandatória para futuras fases de homologação e testes.

---

## 1. Regras de Bloqueio Estrito

1. **Proibição Absoluta em Produção:**
   - A rotina de limpeza aborta imediatamente se a variável `NODE_ENV === 'production'`.
2. **Reautenticação de Administrador Ativo:**
   - Apenas administradores com sessão válida e confirmação de senha em tempo real podem solicitar o procedimento.
3. **Trava de Confirmação por Frase:**
   - O usuário deve digitar expressamente no modal a frase: `LIMPAR AMBIENTE DESENVOLVIMENTO`.
4. **Relatório Prévio (Dry-Run):**
   - Antes da execução, o sistema exibe a contagem exata de registros por tabela que serão eliminados.

---

## 2. O Que É Preservado Obrigatoriamente (Nunca Apagar)

- O schema do banco e a integridade de todas as collections.
- Todas as migrations registradas na tabela `_migrations`.
- Todos os arquivos de pb_hooks e regras de RLS.
- A conta do Administrador Inicial (`admin@construindomeufuturo.com`).
- A documentação e arquivos do repositório.

---

## 3. O Que É Higienizado em Ambiente Autorizado

- Registros de teste nas collections de domínio: `portfolios`, `institutions`, `accounts`, `positions`, `movements`, `transfers`, `wealth_goals`, `consolidations`.
- Convites expirados ou descartados da collection `invitations`.
- Arquivos temporários e anexos de teste vinculados aos registros removidos.

---

## 4. Auditoria da Operação

Ao término da execução (ou em caso de falha), um registro de severidade `CRITICAL` é gravado na collection `audit_logs` contendo o ID do administrador solicitante, timestamp UTC, quantidade de registros expurgados e status final da operação.
