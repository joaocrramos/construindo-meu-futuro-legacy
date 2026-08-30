import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

describe('Guarda contra reincidência de código morto (skipAi)', () => {
  const rootDir = resolve(__dirname, '../..')
  const srcDir = resolve(__dirname, '..')

  it('o arquivo src/lib/skipAi.ts NÃO deve existir no repositório', () => {
    const skipAiPath = join(srcDir, 'lib', 'skipAi.ts')
    expect(existsSync(skipAiPath)).toBe(false)
  })

  it('nenhum arquivo de código em src/ deve importar ou referenciar skipAi', () => {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json']
    const forbiddenPatterns = [
      /from\s+['"][^'"]*skipAi[^'"]*['"]/i,
      /import\s+['"][^'"]*skipAi[^'"]*['"]/i,
      /require\(['"][^'"]*skipAi[^'"]*['"]\)/i,
    ]

    function scanDir(dir: string): Array<{ file: string; line: number; match: string }> {
      const violations: Array<{ file: string; line: number; match: string }> = []
      const entries = readdirSync(dir)

      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          // Ignora o próprio diretório de testes para evitar autorreferência
          if (fullPath === join(srcDir, 'test')) continue
          violations.push(...scanDir(fullPath))
        } else if (stat.isFile()) {
          const hasCodeExt = codeExtensions.some((ext) => entry.endsWith(ext))
          if (!hasCodeExt) continue

          const content = readFileSync(fullPath, 'utf8')
          const lines = content.split('\n')
          lines.forEach((line, index) => {
            for (const pattern of forbiddenPatterns) {
              if (pattern.test(line)) {
                violations.push({
                  file: fullPath.replace(rootDir, ''),
                  line: index + 1,
                  match: line.trim(),
                })
              }
            }
          })
        }
      }
      return violations
    }

    const violations = scanDir(srcDir)
    expect(violations).toEqual([])
  })

  it('nenhum arquivo de configuração da raiz deve importar ou referenciar skipAi', () => {
    const configFiles = [
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.ts',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'components.json',
      'index.html',
    ]

    const violations: Array<{ file: string; line: number; match: string }> = []
    const forbiddenPattern = /skipAi/i

    for (const file of configFiles) {
      const fullPath = join(rootDir, file)
      if (!existsSync(fullPath)) continue

      const content = readFileSync(fullPath, 'utf8')
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        if (forbiddenPattern.test(line)) {
          violations.push({
            file,
            line: index + 1,
            match: line.trim(),
          })
        }
      })
    }

    expect(violations).toEqual([])
  })
})
