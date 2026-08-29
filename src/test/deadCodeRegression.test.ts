import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

// `src/lib/skipAi.ts` é um artefato de template sem nenhuma referência no
// projeto. Ele já foi removido três vezes e reintroduzido duas, sempre por
// sincronização automática da plataforma e sem menção em commit. Este teste
// existe para que a reincidência falhe o CI no commit que a traz de volta,
// em vez de ser descoberta em auditoria manual.
//
// Se algum dia o arquivo passar a ser genuinamente necessário, este teste deve
// ser removido em um commit deliberado que também documente o uso — nunca
// silenciado com skip.

const repoRoot = resolve(__dirname, '..', '..')
const ORPHAN_FILES = ['src/lib/skipAi.ts']
const ORPHAN_SYMBOL = 'skipAi'
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json'])

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      collectSourceFiles(fullPath, acc)
    } else if (SCANNED_EXTENSIONS.has(extname(entry))) {
      acc.push(fullPath)
    }
  }
  return acc
}

describe('Testes de Regressão de Código Órfão', () => {
  it.each(ORPHAN_FILES)('1. O arquivo órfão %s não existe no repositório', (relativePath) => {
    expect(existsSync(join(repoRoot, relativePath))).toBe(false)
  })

  it('2. Nenhum arquivo de src/ referencia o módulo órfão', () => {
    const offenders = collectSourceFiles(join(repoRoot, 'src'))
      .filter((file) => readFileSync(file, 'utf8').includes(ORPHAN_SYMBOL))
      .map((file) => file.slice(repoRoot.length + 1))
      // Este próprio arquivo de teste cita o nome do símbolo e não é uma referência real.
      .filter((file) => file !== 'src/test/deadCodeRegression.test.ts')

    expect(offenders).toEqual([])
  })

  it('3. Nenhum arquivo de configuração da raiz referencia o módulo órfão', () => {
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'vite.config.ts',
      'vitest.config.ts',
      'components.json',
      '.skip.config.json',
    ]

    const offenders = configFiles
      .filter((file) => existsSync(join(repoRoot, file)))
      .filter((file) => readFileSync(join(repoRoot, file), 'utf8').includes(ORPHAN_SYMBOL))

    expect(offenders).toEqual([])
  })
})
