#!/usr/bin/env node
/**
 * Guarda de versionamento (ADR-006).
 *
 * A versão oficial do produto é o campo `version` do package.json. Este script
 * falha quando a entrada mais recente do CHANGELOG.md não corresponde a ela.
 *
 * Existe porque o desalinhamento reincidiu em várias versões seguidas: commits
 * automáticos "vX.Y.Z" incrementam o package.json sem entrada correspondente no
 * CHANGELOG, e a divergência só era descoberta em auditoria manual. Rodando no
 * CI, a divergência passa a falhar o build no mesmo commit que a introduz.
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
      '    1. A versão oficial do produto é o campo "version" do package.json.\n' +
      '    2. O CHANGELOG.md deve acompanhar estritamente essa mesma versão.\n\n' +
      '  Para corrigir, adicione ao topo do CHANGELOG.md a entrada da versão\n' +
      '  declarada no package.json, ou reverta o incremento de versão caso ele\n' +
      '  não corresponda a uma alteração de produto (ADR-006, regras 4 e 5).\n',
  )
  process.exit(1)
}

const pkgPath = join(repoRoot, 'package.json')
const changelogPath = join(repoRoot, 'CHANGELOG.md')

let pkgVersion
try {
  pkgVersion = JSON.parse(readFileSync(pkgPath, 'utf8')).version
} catch (error) {
  fail(`Não foi possível ler ${pkgPath}.`, `  ${error.message}`)
}

if (typeof pkgVersion !== 'string' || !SEMVER.test(pkgVersion)) {
  fail(`package.json não declara uma versão semântica válida (recebido: ${String(pkgVersion)}).`)
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

if (changelogVersion !== pkgVersion) {
  fail(
    `package.json declara "${pkgVersion}", mas a entrada mais recente do CHANGELOG.md é "${changelogVersion}".`,
  )
}

console.log(`✔ Versionamento alinhado: package.json e CHANGELOG.md em ${pkgVersion}`)
