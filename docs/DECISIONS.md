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

---

## ADR-006: Alinhamento de Versionamento da Plataforma (v0.0.8)

- **Status:** Aprovado.
- **Contexto:** O contador interno de build/deploy da plataforma registrou a versão `0.0.8` (referência `deployment.lastDevBuildRef` no hash `4d52684`), e o `package.json` já havia sido alinhado para `"version": "0.0.8"`. No entanto, a entrada mais recente no `CHANGELOG.md` ainda constava como `[0.0.7]`, gerando divergência entre os artefatos de documentação e a configuração do pacote.
- **Decisão:** Alinhar o cabeçalho do `CHANGELOG.md` de `[0.0.7]` para `[0.0.8]` mantendo todo o conteúdo e a data (`2026-08-29`), consolidando a versão `0.0.8` em todos os registros do repositório. Nenhuma funcionalidade de Fase 2 foi declarada como concluída.
- **Consequências:** Sincronização e rastreabilidade total entre o contador da plataforma, o manifesto do projeto (`package.json`) e o histórico de alterações (`CHANGELOG.md`), sem modificações em esquemas de banco, autenticação ou regras de negócio.
