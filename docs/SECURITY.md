# Políticas de Segurança & Diretrizes de Acesso Consolidada

Este documento reúne as diretrizes obrigatórias de segurança da informação, controle de acesso e isolamento de dados do **Construindo Meu Futuro**.

---

## 1. Princípio do Acesso Exclusivo (Invite-Only)

O **Construindo Meu Futuro** não permite autocadastro público. Apenas titulares nominalmente autorizados conseguem criar conta na plataforma.

### Ciclo de Vida do Convite:

1. **Emissão:** O Administrador emite o convite informando o e-mail do titular e o papel (`role: 'user' | 'admin'`).
2. **Geração do Token:** O backend gera uma chave criptográfica forte de alta entropia. O banco armazena apenas o hash seguro `token_hash` (SHA-256) e o identificador público `token_public_id`.
3. **Expiração Rígida:** O convite tem validade fixa e improrrogável de **7 dias** a partir da emissão.
4. **Validação & Congelamento:**
   - A página de cadastro valida o token via endpoint backend com comparação em tempo constante.
   - O campo de e-mail é congelado com o endereço registrado no convite.
5. **Consumação Atômica:** Na criação da senha, o status do convite é atualizado para `accepted` dentro da mesma transação em que a conta é ativada, impedindo reutilização.

---

## 2. Isolamento de Titularidade (Row-Level Security - RLS)

Todas as collections patrimoniais (`portfolios`, `institutions`, `accounts`, `account_balances`, `assets`, `positions`, `movements`, `transfers`, `wealth_goals`, `consolidations`) operam sob a regra estrita de isolamento:

```
@request.auth.id != '' && user_id = @request.auth.id
```

### Garantias de RLS:

- **Isolamento de Leitura:** Usuários não autenticados ou outros titulares recebem lista vazia / 404 em qualquer requisição.
- **Isolamento de Ativos (ADR-014):** A collection `assets` é 100% isolada por titular, eliminando vetores de enumeração de carteiras alheias.
- **Criação Backend-Only (F1):** Tabelas de mutação financeira sensível (`movements`, `transfers`, `quotes`, `invitations`, `positions`, `account_balances`) possuem `createRule = null` ou restrita, operando apenas via endpoints transacionais `$app.runInTransaction`.
- **Proteção de Campos Administrativos:** O hook `protect_admin_fields` bloqueia a edição de `role`, `status`, `must_change_password` e `emailVisibility` por usuários comuns (impedindo vazamento de e-mails em expansões relacionais).

---

## 3. Política de Auditoria Centralizada (`audit_logs`)

Eventos sensíveis são gravados de forma imutável na collection `audit_logs`.

### Eventos Auditados Obrigatoriamente:

- Login com sucesso, falhas de autenticação e logout.
- Solicitação de redefinição de senha e alteração efetiva de credenciais.
- Ativação de administrador inicial (`ADMIN_ACTIVATED`).
- Emissão, revogação e aceitação de convites.
- Criação e suspensão de contas.
- Execução de rotinas de higienização ou purga de auditoria (`AUDIT_PURGE_RUN`).

### Regras de Sanitização de Logs:

- **NUNCA** registrar senhas em texto puro, hashes parciais ou senhas temporárias.
- **NUNCA** registrar tokens JWT completos, API keys do Resend ou segredos de ambiente.
- **NUNCA** expor o link de recuperação completo nos logs.

### Política de Retenção:

- Logs operacionais gerais: **365 dias** de retenção online.
- Registros de purga (`AUDIT_PURGE_RUN`): **7 anos** de retenção auditável.

---

## 4. Estratégia de E-mails Transacionais (Resend)

1. **Variáveis de Ambiente Mandatórias (Apenas no Backend via Segredos):**
   - `RESEND_API_KEY`: Chave da API do Resend.
   - `RESEND_FROM_EMAIL`: Remetente verificado (ex: `contato@construindomeufuturo.com`).
   - `RESEND_FROM_NAME`: Nome de exibição institucional.
   - `SITE_URL`: URL canônica da aplicação frontend.
2. **Resiliência e Fallbacks:**
   - Credenciais nunca trafegam para o frontend.
   - Em ambiente de desenvolvimento/teste sem Resend configurado, os links de ativação são emitidos com segurança no console de logs do backend.

---

## 5. Bootstrap do Administrador Inicial (E1–E10, ADR-017)

- **Sem Credenciais Estáticas:** Nenhum e-mail ou senha administrativa é incluído em arquivos versionados.
- **Fonte via Segredo:** O e-mail inicial é injetado via secret `BOOTSTRAP_ADMIN_EMAIL`.
- **Ativação por Fluxo de Uso Único:** A migration cria o registro inicial com `status='pending'` e senha inoperante. O administrador ativa o acesso na tela de Primeiro Acesso / Recuperação, promovendo o status para `active` e registrando `ADMIN_ACTIVATED`.
- **Anti-Enumeração e Rate Limiting:** A resposta a solicitações públicas de ativação/recuperação é temporalmente e textualmente idêntica para contas existentes e inexistentes, com limite de requisições por IP.
