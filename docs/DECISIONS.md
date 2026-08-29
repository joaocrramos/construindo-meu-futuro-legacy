# Registro de Decisões de Arquitetura (ADRs)

## ADR-001: Acesso Exclusivo por Convite (Invite-Only)

- **Status:** Aprovado e Mandatório.
- **Contexto:** A plataforma é destinada à organização de patrimônio e investimentos individuais/familiares, exigindo rigor no controle de quem ingressa no ambiente.
- **Decisão:** Desabilitar autocadastro público. Apenas convites emitidos por administradores com token criptográfico de uso único permitem o registro.
- **Consequências:** Rotas `/register` exigem validação de token em tempo real; o e-mail registrado é congelado a partir do convite original.

---

## ADR-002: Isolamento de Dados por RLS (Row-Level Security)

- **Status:** Aprovado.
- **Contexto:** Múltiplos titulares podem utilizar a mesma instância, porém nenhum dado financeiro pode vazar entre contas.
- **Decisão:** Aplicar regras de RLS no PocketBase vinculando toda entidade patrimonial a `@request.auth.id = user_id`.
- **Consequências:** Impossibilidade de consultas transversais no frontend.

---

## ADR-003: Exibição de Estados Vazios Reais (Sem Mocks Artificiais)

- **Status:** Aprovado.
- **Contexto:** Ambientes novos não devem induzir o usuário a erro com saldos ou gráficos fictícios.
- **Decisão:** Desenvolver componentes `EmptyState` que instruem o próximo passo recomendado (ex: "Cadastre sua primeira carteira") em vez de popular números aleatórios.
- **Consequências:** Clareza no onboarding e integridade da experiência do usuário.

---

## ADR-004: Persistência de Tema Triplo (Claro / Escuro / Sistema)

- **Status:** Aprovado.
- **Contexto:** Aplicações financeiras exigem conforto visual em diferentes turnos e iluminações de ambiente.
- **Decisão:** Implementar `ThemeProvider` próprio com suporte aos temas `light`, `dark` (Deep Obsidian) e `system`, sincronizado com classe `.dark` no elemento raiz e persistido no `localStorage`.
- **Consequências:** Transição suave sem flickering de carregamento.

---

## ADR-005: Formatação Financeira Nacional Padronizada

- **Status:** Aprovado.
- **Contexto:** Valores em BRL exigem separador de milhar com ponto e decimal com vírgula, com distinção entre valores brutos e líquidos.
- **Decisão:** Criar módulo central `src/lib/formatters.ts` com testes unitários cobrindo nulos, negativos e distinção de impostos.
