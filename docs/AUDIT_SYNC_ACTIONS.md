# Auditoria de Sincronismo Git e GitHub Actions

Data da verificação: 24/09/2026  
Versão semântica: 0.0.123 (`package.json` / `VERSION`: 0.0.122)

---

## 1. Estado do Repositório Git Local vs. Remoto

- **Branch ativa**: `main` (rastreada via `refs/heads/main`).
- **Commit no topo de `main` local**: `ca0bf8710c07c960fcc9264995f6001eafed6f73`.
- **Commit no topo de `origin/main` remoto**: `ca0bf8710c07c960fcc9264995f6001eafed6f73`.
- **Último `FETCH_HEAD`**:
  ```
  ca6960fb679125945ebc4612e0ec2e7d263f201e branch 'main' of https://<token>@github.com/joaocrramos/construindo-meu-futuro.git
  ```
- **Paridade**: `refs/heads/main` e `refs/remotes/origin/main` apontam exatamente para o mesmo commit hash (`ca0bf8710c07c960fcc9264995f6001eafed6f73`). Não existem commits divergentes, pendentes de push nem pendentes de pull. Árvore de trabalho limpa.
- **Tag mais recente**: `v0.0.123` apontando para `73efc89ab32dc04dc5baed22e3c2d6ddac2a9d1a`.
- **Investigação sobre o commit `ac199b9`**:
  O hash `ac199b9` citado nos relatos anteriores não existe no histórico local nem no remoto (`origin/main`). O commit real que contém a sincronização da versão 0.0.35 e as correções de teste/CI é o commit `8b47bb3c255be65a74094ea4baf4abebc76ea9cf` (precedido por `4ef56a5143cd0d620efc87e59d62787bcbc20484`).

---

## 2. Acesso à API do GitHub e Status do GitHub Actions

- **Repositório remoto**: `joaocrramos/construindo-meu-futuro`.
- **Visibilidade**: Repositório privado (`public_repos: 0` na conta do proprietário).
- **Consulta via API REST (`GET /repos/joaocrramos/construindo-meu-futuro/actions/runs`)**:
  - Retorna `HTTP 404 Not Found` para requisições anônimas, comportamento padrão da API do GitHub para repositórios privados.
  - O ambiente não possui `GITHUB_TOKEN` nem `GH_TOKEN` configurado nos segredos da aplicação (apenas segredos de infraestrutura do PocketBase e Resend estão presentes).
  - A visualização dos runs do GitHub Actions na interface web exige autenticação direta pelo usuário com acesso de leitura ao repositório `https://github.com/joaocrramos/construindo-meu-futuro/actions`.

---

## 3. Integridade dos Componentes no Repositório

- **Setup global do Vitest**:
  - `vitest.config.ts` possui `setupFiles: ['./src/test/setup.ts']`.
  - `src/test/setup.ts` devidamente configurado com `afterEach(() => { cleanup() })`.
- **Guarda de versionamento**:
  - `VERSION`: `0.0.35`.
  - `CHANGELOG.md`: `## [0.0.35] - 2026-09-23`.
- **Guarda de migrations**:
  - Migrations de 0001 a 0022 em ordem estrita e aplicadas no backend.
- **Backend PocketBase**:
  - Instância ativa, schema sincronizado e job diário `daily_alerts_check` em execução.
