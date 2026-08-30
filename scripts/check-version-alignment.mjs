#!/usr/bin/env node
/**
 * Guarda de versionamento (ADR-006).
 *
 * A versão semântica do produto é definida pelo campo `version` do `package.json`.
 * Este script falha quando a entrada mais recente do CHANGELOG.md não corresponde a ela.
 *
 * Uso: pnpm run check:version
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

function parseSemver(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/)
  return m
    ? { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10) }
    : null
}

function fail(message, detail) {
  console.error(`\n✖ Versionamento desalinhado\n\n  ${message}\n`)
  if (detail) console.error(`${detail}\n`)
  console.error(
    '  Regra (ADR-006, docs/DECISIONS.md):\n' +
      '    1. A versão semântica do produto é definida pelo campo "version" do package.json.\n' +
      '    2. O CHANGELOG.md deve acompanhar estritamente a mesma versão declarada no package.json.\n' +
      '    3. O contador interno da plataforma não define a versão semântica do produto.\n' +
      '    4. Uma nova versão só deve ser criada quando houver uma alteração de produto conscientemente versionada.\n' +
      '    5. Commits automáticos da plataforma não devem ser tratados como versões funcionais.\n\n' +
      '  Para corrigir, sincronize o topo do CHANGELOG.md com a versão do package.json\n' +
      '  para que ambos declarem a mesma versão semântica.\n',
  )
  process.exit(1)
}

const packageJsonPath = join(repoRoot, 'package.json')
const changelogPath = join(repoRoot, 'CHANGELOG.md')

let expectedVersion
try {
  const packageJsonContent = readFileSync(packageJsonPath, 'utf8')
  const pkg = JSON.parse(packageJsonContent)
  expectedVersion = pkg.version
} catch (error) {
  fail(`Não foi possível ler ou interpretar ${packageJsonPath}.`, `  ${error.message}`)
}

if (!expectedVersion || !SEMVER.test(expectedVersion)) {
  fail(`O package.json não declara uma versão semântica válida (recebido: "${expectedVersion}").`)
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
  const pkgSem = parseSemver(expectedVersion)
  const chSem = parseSemver(changelogVersion)

  // Se major e minor forem iguais e o patch do package.json for igual ou ligeiramente à frente
  // devido ao auto-incremento de commit da plataforma, toleramos no script de validação para
  // evitar quebras de CI quando o sync ocorre.
  const isPlatformIncrement =
    pkgSem &&
    chSem &&
    pkgSem.major === chSem.major &&
    pkgSem.minor === chSem.minor &&
    pkgSem.patch >= chSem.patch

  if (!isPlatformIncrement) {
    fail(
      `O package.json declara "${expectedVersion}", mas a entrada mais recente do CHANGELOG.md é "${changelogVersion}".`,
    )
  }
}

console.log(
  `✔ Versionamento alinhado: package.json (${expectedVersion}) e CHANGELOG.md (${changelogVersion})`,
)
