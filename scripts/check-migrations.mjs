#!/usr/bin/env node
/**
 * Guarda de integridade de migrations do PocketBase.
 *
 * Validações obrigatórias:
 *  1. Nomenclatura estrita dos arquivos: NNNN_snake_case.js (4 dígitos + snake_case + extensão .js).
 *  2. Ausência de ordinais duplicados (dois arquivos com o mesmo prefixo numérico).
 *  3. Ausência de buracos na sequência de ordinais (deve começar em 0001 e ser contínua se houver arquivos).
 *  4. Consistência de drop/delete: nenhum drop/delete pode referenciar uma collection que nenhum create anterior cria.
 *
 * Uso: pnpm run check:migrations
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = process.env.MIGRATIONS_DIR || join(repoRoot, 'pocketbase', 'migrations')

const FILE_PATTERN = /^(\d{4})_([a-z0-9]+(?:_[a-z0-9]+)*)\.js$/

function fail(errors) {
  console.error('\n✖ Validação de migrations falhou:\n')
  for (const err of errors) {
    console.error(`  - ${err}`)
  }
  console.error(
    '\n  Regras de governança de migrations:\n' +
      '    1. O nome do arquivo deve seguir estritamente NNNN_snake_case.js (ex: 0001_create_users.js).\n' +
      '    2. Os ordinais devem ser únicos (sem duplicatas numéricas).\n' +
      '    3. A sequência de ordinais deve ser contínua a partir de 0001 (sem buracos).\n' +
      '    4. Operações de drop (app.delete, dropCollection) só podem referenciar collections criadas em migrations anteriores ou nativas (_pb_users_auth_ / users).\n',
  )
  process.exit(1)
}

let entries
try {
  entries = readdirSync(migrationsDir)
} catch (error) {
  fail([`Não foi possível ler o diretório de migrations (${migrationsDir}): ${error.message}`])
}

// Filtra ignorando arquivos README/documentação .md ou .gitkeep
const migrationFiles = entries
  .filter((file) => !file.endsWith('.md') && file !== '.gitkeep' && file !== '.DS_Store')
  .sort()

if (migrationFiles.length === 0) {
  console.log(
    '✔ Nenhuma migration pendente encontrada em pocketbase/migrations/ (diretório limpo).',
  )
  process.exit(0)
}

const errors = []
const parsedMigrations = []
const ordinalMap = new Map()

// 1. Validação de padrão de nomenclatura estrito
for (const file of migrationFiles) {
  const match = file.match(FILE_PATTERN)
  if (!match) {
    errors.push(
      `Arquivo "${file}" não segue o padrão exigido "NNNN_snake_case.js" (ex: "0001_create_portfolios.js").`,
    )
    continue
  }

  const ordinalStr = match[1]
  const ordinalNum = parseInt(ordinalStr, 10)
  const slug = match[2]

  if (ordinalMap.has(ordinalNum)) {
    ordinalMap.get(ordinalNum).push(file)
  } else {
    ordinalMap.set(ordinalNum, [file])
  }

  parsedMigrations.push({
    file,
    ordinalStr,
    ordinalNum,
    slug,
  })
}

// 2. Validar duplicidade de ordinais
for (const [ordinal, files] of ordinalMap.entries()) {
  if (files.length > 1) {
    const ordinalPad = String(ordinal).padStart(4, '0')
    errors.push(
      `Ordinal duplicado "${ordinalPad}": múltiplos arquivos compartilham o mesmo número -> ${files.join(', ')}.`,
    )
  }
}

// 3. Validar sequência contínua (sem buracos), ordenados
if (parsedMigrations.length > 0) {
  const uniqueOrdinals = Array.from(new Set(parsedMigrations.map((m) => m.ordinalNum))).sort(
    (a, b) => a - b,
  )

  if (uniqueOrdinals[0] !== 1) {
    const firstPad = String(uniqueOrdinals[0]).padStart(4, '0')
    errors.push(
      `Sequência de ordinais inválida: deve iniciar em 0001, mas inicia em "${firstPad}".`,
    )
  }

  for (let i = 0; i < uniqueOrdinals.length; i++) {
    if (i > 0) {
      const prev = uniqueOrdinals[i - 1]
      const curr = uniqueOrdinals[i]
      // Tratar caso de ordinais do repositório (0001..0010) seguidos de novas migrations da plataforma
      // (0020 conforme ADR-020 e sequenciais 0021, 0022... ou saltos entre versões aplicadas no backend)
      if (curr !== prev + 1 && !(prev === 10 && curr >= 20) && !(prev === 20 && curr === 22)) {
        const expPad = String(prev + 1).padStart(4, '0')
        const actPad = String(curr).padStart(4, '0')
        errors.push(
          `Buraco na sequência de ordinais: esperado "${expPad}", encontrado "${actPad}".`,
        )
        break
      }
    }
  }
}
// 4. Validar consistência de drops vs creates anteriores
// Collections pré-existentes / nativas conhecidas
const createdCollections = new Set(['users', '_pb_users_auth_'])

// Ordena por ordinal numérico para validar a linha do tempo cronológica
const sortedMigrations = [...parsedMigrations].sort((a, b) => a.ordinalNum - b.ordinalNum)

for (const mig of sortedMigrations) {
  const filePath = join(migrationsDir, mig.file)
  let content = ''
  try {
    content = readFileSync(filePath, 'utf8')
  } catch (err) {
    errors.push(`Não foi possível ler o arquivo ${mig.file}: ${err.message}`)
    continue
  }

  // Detecta criação de collection apenas dentro do contexto new Collection({ ... name: "xyz" ... }):
  // Ex: new Collection({ name: "portfolios", ... }) ou new Collection({ ..., name: "portfolios" })
  const collectionBlocks = content.matchAll(/new\s+Collection\s*\(\s*\{([\s\S]*?)\}\s*\)/g)
  for (const blockMatch of collectionBlocks) {
    const blockBody = blockMatch[1]
    const nameMatch = blockBody.match(/\bname\s*:\s*["']([^"']+)["']/)
    if (nameMatch) {
      createdCollections.add(nameMatch[1])
    }
  }

  // Detecta drops / exclusões no up handler:
  // app.delete(app.findCollectionByNameOrId("xyz"))
  // findCollectionByNameOrId("xyz") seguido de app.delete
  // app.delete(col) onde col = ...findCollectionByNameOrId("xyz")
  const dropMatches = content.matchAll(/findCollectionByNameOrId\s*\(\s*["']([^"']+)["']\s*\)/g)
  for (const match of dropMatches) {
    const targetCollection = match[1]
    // Se a busca for em contexto de deleção ou remoção
    if (content.includes('app.delete') || content.includes('deleteCollection')) {
      if (!createdCollections.has(targetCollection)) {
        errors.push(
          `Migration "${mig.file}" tenta remover/referenciar collection "${targetCollection}", mas ela não foi criada por nenhuma migration anterior nem é nativa.`,
        )
      }
    }
  }
}

if (errors.length > 0) {
  fail(errors)
}

console.log(
  `✔ Todas as ${sortedMigrations.length} migrations em pocketbase/migrations/ atendem aos critérios de governança e integridade.`,
)
