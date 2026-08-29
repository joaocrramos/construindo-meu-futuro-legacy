#!/usr/bin/env node
/**
 * Guarda de versionamento (ADR-006).
 *
 * A versão semântica do produto é definida pelo arquivo `VERSION` na raiz. Este script
 * falha quando a entrada mais recente do CHANGELOG.md não corresponde a ela.
 *
 * O campo `version` do package.json é gerenciado como contador operacional pela
 * plataforma a cada commit/deploy e NÃO define a versão semântica do produto.
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
      '    1. A versão semântica do produto é definida pelo arquivo VERSION na raiz.\n' +
      '    2. O CHANGELOG.md deve acompanhar estritamente a mesma versão declarada em VERSION.\n' +
      '    3. O campo version do package.json é gerido automaticamente pela plataforma\n' +
      '       como contador operacional e não define a versão semântica.\n\n' +
      '  Para corrigir, sincronize o arquivo VERSION e o topo do CHANGELOG.md\n' +
      '  para que ambos declarem a mesma versão semântica.\n',
  )
  process.exit(1)
}

const versionFilePath = join(repoRoot, 'VERSION')
const changelogPath = join(repoRoot, 'CHANGELOG.md')

let expectedVersion
try {
  expectedVersion = readFileSync(versionFilePath, 'utf8')
    .trim()
    .replace(/^["']|["']$/g, '')
} catch (error) {
  fail(`Não foi possível ler ${versionFilePath}.`, `  ${error.message}`)
}

if (!SEMVER.test(expectedVersion)) {
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

console.log(`✔ Versionamento alinhado: VERSION e CHANGELOG.md em ${expectedVersion}`)
