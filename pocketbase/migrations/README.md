# Sequência Lógica de Migrations Planejadas (Fase 2)

Este diretório armazena as migrations JavaScript do PocketBase (PocketBase v0.36 JSVM) para evolução do banco de dados.

> **Importante:** Em conformidade com o escopo da Fundação MVP, **nenhuma migration foi aplicada nesta primeira fase**. A sequência abaixo define a ordem lógica de execução planejada para quando a modelagem for persistida no backend.

---

## Sequência Inicial de Migrations Proposta

```
pocketbase/migrations/
├── 0001_create_core_auth_fields.js   # Ajuste e campos adicionais na auth collection users (role, phone, status)
├── 0002_create_invitations.js        # Criação da collection invitations e regras de token Invite-Only
├── 0003_create_audit_logs.js         # Criação da collection audit_logs para trilha de segurança imutável
├── 0004_create_portfolios.js         # Criação de agrupamentos patrimoniais com RLS por user_id
├── 0005_create_institutions.js       # Criação de instituições financeiras parceiras
├── 0006_create_accounts.js           # Criação de contas correntes e contas de investimento
├── 0007_create_assets.js             # Catálogo de instrumentos negociáveis (Renda Fixa, Ações, FIIs, Fundos)
├── 0008_create_positions.js          # Posições de custódia vinculando Carteira, Conta e Ativo
├── 0009_create_movements.js          # Registro de movimentações, aportes, compras, vendas e proventos
├── 0010_create_transfers.js          # Transferências entre contas do mesmo titular
├── 0011_create_quotes.js             # Cotações e marcação a mercado
├── 0012_create_wealth_goals.js       # Metas patrimoniais e de independência
├── 0013_create_consolidations.js     # Fechamentos mensais consolidados do patrimônio
└── README.md                         # Este arquivo de documentação e planejamento
```

---

## Diretrizes de Implementação das Migrations:
1. **Sem Senhas ou Segredos no Código:** Migrations nunca devem conter senhas fixas, tokens de API ou credenciais em texto claro.
2. **Autodate Mandatório:** Toda collection do tipo `base` deve conter explicitamente os campos `created` e `updated` do tipo `autodate`.
3. **Idempotência:** Migrations de seed ou verificação devem usar `app.findFirstRecordByData` ou `app.hasTable` para garantir que repetições não falhem.
4. **Relacionamentos Seguros:** Usar `_pb_users_auth_` para referenciar a collection de usuários ou `app.findCollectionByNameOrId("name").id` para collections já criadas.
