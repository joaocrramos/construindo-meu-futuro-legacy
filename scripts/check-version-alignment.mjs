#!/usr/bin/env node
/**
 * Guarda de versionamento (ADR-006).
 *
 * A versão semântica do produto é definida pelo arquivo `VERSION`.
 * Este script falha quando a entrada mais recente do CHANGELOG.md não corresponde a ela.
 *
 * Uso: pnpm run check:version
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

function fail(message, detail) {
  console.error(`\n✖ Versionamento desalinhado\n\n  ${message}\n`)
  if (detail) console.error(`${detail}\n`)
  console.error(
    '  Regra (ADR-006, docs/DECISIONS.md):\n' +
      '    1. A versão semântica do produto é definida pelo arquivo VERSION.\n' +
      '    2. O CHANGELOG.md deve declarar estritamente a mesma versão do VERSION.\n' +
      '    3. O campo version do package.json é contador de build da plataforma, é incrementado automaticamente a cada persistência e NÃO representa a versão do produto.\n' +
      '    4. Uma nova versão semântica só é criada por decisão consciente, editando VERSION e escrevendo a entrada correspondente no CHANGELOG no mesmo commit.\n' +
      '    5. Commits automáticos da plataforma não constituem versões funcionais.\n' +
      '    6. A regra 2 é verificada automaticamente pelo check:version, que roda no CI.\n\n' +
      '  Para corrigir, sincronize o topo do CHANGELOG.md com a versão do arquivo VERSION\n' +
      '  para que ambos declarem a mesma versão semântica.\n',
  )
  process.exit(1)
}

const versionFilePath = join(repoRoot, 'VERSION')
const changelogPath = join(repoRoot, 'CHANGELOG.md')

let expectedVersion
try {
  const versionFileContent = readFileSync(versionFilePath, 'utf8')
  expectedVersion = versionFileContent.trim()
} catch (error) {
  fail(`Não foi possível ler o arquivo VERSION na raiz (${versionFilePath}).`, `  ${error.message}`)
}

if (!expectedVersion || !SEMVER.test(expectedVersion)) {
  fail(
    `O arquivo VERSION não declara uma versão semântica válida (recebido: "${expectedVersion}").`,
  )
}

let changelog
try {
  changelog = readFileSync(changelogPath, 'utf8')
} catch (error) {
  fail(`Não foi possível ler ${changelogPath}.`, `  ${error.message}`)
}

// Primeira entrada de versão do CHANGELOG, no formato "## [X.Y.Z] - ...".
const heading = changelog.match(/^##\s*\[([^\]]+)\]/m)

if (!heading) {
  fail('Nenhuma entrada de versão encontrada no CHANGELOG.md (esperado "## [X.Y.Z]").')
}

const changelogVersion = heading[1].trim()

if (changelogVersion !== expectedVersion) {
  fail(
    `O arquivo VERSION declara "${expectedVersion}", mas a entrada mais recente do CHANGELOG.md é "${changelogVersion}".`,
  )
}

console.log(
  `✔ Versionamento alinhado: VERSION (${expectedVersion}) e CHANGELOG.md (${changelogVersion})`,
)
