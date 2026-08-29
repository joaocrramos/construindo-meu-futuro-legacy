# Políticas de Segurança & Diretrizes de Acesso

## 1. Princípio do Acesso Exclusivo (Invite-Only)

O **Construindo Meu Futuro** não permite autocadastro público. Apenas titulares nominalmente autorizados conseguem criar conta na plataforma.

### Ciclo de Vida do Convite:

1. **Emissão:** O Administrador acessa `/admin/invites` e gera um convite informando o e-mail do titular.
2. **Geração do Token:** Um token criptográfico seguro (mínimo 32 caracteres / formato `INV-XXX...`) é gerado no backend com prazo de expiração fixo de **7 dias**.
3. **Disparo:** O titular recebe o link transacional de ativação (ex: `https://app.construindomeufuturo.com/register?token=XYZ`).
4. **Validação & Congelamento:**
   - A página de cadastro valida o token em tempo real contra o banco.
   - O campo de e-mail é **congelado (somente leitura)** com o endereço do convite, impossibilitando que o token seja reaproveitado para registrar outro e-mail.
5. **Consumação:** Ao criar a senha, o status do convite muda para `accepted`, tornando o token permanentemente inválido para novas tentativas.

---

## 2. Isolamento de Titularidade (Row-Level Security - RLS)

Cada tabela do domínio patrimonial (`portfolios`, `accounts`, `positions`, `movements`, `transfers`, `wealth_goals`, `consolidations`) possui a regra de acesso obrigatória:

```
@request.auth.id != '' && user_id = @request.auth.id
```

### Garantias de RLS:

- **Leitura Proibida:** Nenhuma requisição consegue listar ou visualizar registros pertencentes a outro `user_id`.
- **Injeção de Titularidade:** Na criação, o backend vincula o `user_id` à chave do usuário autenticado no token JWT.
- **Prevenção de Escalação de Privilégios:** O usuário comum **NÃO** tem permissão de alterar seu próprio campo `role` (`admin`/`user`), `status` ou permissões. O endpoint de update bloqueia edições em campos administrativos.

---

## 3. Política de Auditoria Centralizada

Eventos sensíveis são gravados de forma imutável na collection `audit_logs`.

### Eventos Auditados Obrigatoriamente:

- Login com sucesso e tentativas com senha incorreta.
- Solicitação de redefinição de senha e alteração efetiva de senha.
- Emissão, revogação e aceitação de convites (_Invite-Only_).
- Criação e suspensão de contas de usuários.
- Acessos a endpoints e telas administrativas.
- Falhas de autorização (tentativas de acessar recursos de outros usuários).

### Regras de Sanitização de Logs:

- **NUNCA** registrar senhas em texto puro, hashes parciais ou senhas temporárias.
- **NUNCA** registrar tokens JWT completos, API keys do Resend ou segredos de ambiente.
- **NUNCA** expor o link de recuperação completo nos logs (armazenar apenas o identificador opaco do evento).

---

## 4. Estratégia de E-mails Transacionais (Resend)

1. **Variáveis de Ambiente Mandatórias (Apenas no Backend):**
   - `RESEND_API_KEY`: Segredo de comunicação com a API do Resend.
   - `RESEND_FROM_EMAIL`: Remetente institucional verificado (ex: `contato@construindomeufuturo.com`).
   - `RESEND_FROM_NAME`: Nome de exibição (`Construindo Meu Futuro`).
   - `SITE_URL`: URL base canônica para geração dos links de convite e ativação.
2. **Regras de Envio:**
   - Credenciais nunca trafegam no código do frontend.
   - Ausência de configuração bloqueia o envio emitindo log explícito de falha no backend.
   - Não são permitidos fallbacks silenciosos ou e-mails fictícios para produção.

---

## 5. Estratégia do Administrador Inicial

- Conta de governança padrão: `admin@construindomeufuturo.com`.
- **Sem senha padrão ou fixa gravada em repositório:** O provisionamento definitivo ocorre por fluxo seguro de Primeiro Acesso (`/first-access`), onde o administrador define a sua própria senha com exigência de troca imediata.
- O provisionamento de admin é idempotente e não gera dados patrimoniais ou carteiras fictícias automáticas.
