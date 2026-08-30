import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()
const migrationsDir = join(repoRoot, 'pocketbase', 'migrations')
const scriptPath = join(repoRoot, 'scripts', 'check-migrations.mjs')

function runCheck() {
  try {
    const stdout = execSync(`node "${scriptPath}"`, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    })
    return { status: 0, stdout, stderr: '' }
  } catch (error: any) {
    return {
      status: error.status ?? 1,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message,
    }
  }
}

describe('check:migrations guard script', () => {
  const tempFiles: string[] = []

  const createTempMigration = (fileName: string, content: string) => {
    const filePath = join(migrationsDir, fileName)
    writeFileSync(filePath, content, 'utf8')
    tempFiles.push(filePath)
    return filePath
  }

  afterEach(() => {
    for (const filePath of tempFiles) {
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
    }
    tempFiles.length = 0
  })

  it('passa com diretório limpo (apenas README.md)', () => {
    const res = runCheck()
    expect(res.status).toBe(0)
    expect(res.stdout).toContain('Nenhuma migration pendente')
  })

  it('falha quando o nome do arquivo não segue o padrão NNNN_snake_case.js', () => {
    createTempMigration('01_bad_name.js', 'migrate((app) => {}, (app) => {})')
    const res = runCheck()
    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain('não segue o padrão exigido "NNNN_snake_case.js"')
  })

  it('falha quando há ordinal duplicado', () => {
    createTempMigration(
      '0001_first_one.js',
      'migrate((app) => { app.save(new Collection({ name: "col_a" })) }, (app) => {})',
    )
    createTempMigration(
      '0001_second_one.js',
      'migrate((app) => { app.save(new Collection({ name: "col_b" })) }, (app) => {})',
    )
    const res = runCheck()
    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain('Ordinal duplicado "0001"')
  })

  it('falha quando há buraco na sequência de ordinais', () => {
    createTempMigration(
      '0001_first.js',
      'migrate((app) => { app.save(new Collection({ name: "col_a" })) }, (app) => {})',
    )
    createTempMigration(
      '0003_third_with_gap.js',
      'migrate((app) => { app.save(new Collection({ name: "col_c" })) }, (app) => {})',
    )
    const res = runCheck()
    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain(
      'Buraco na sequência de ordinais: esperado "0002", encontrado "0003"',
    )
  })

  it('falha quando o primeiro ordinal não for 0001', () => {
    createTempMigration(
      '0004_portfolios.js',
      'migrate((app) => { app.save(new Collection({ name: "portfolios" })) }, (app) => {})',
    )
    const res = runCheck()
    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain(
      'Sequência de ordinais inválida: deve iniciar em 0001, mas inicia em "0004"',
    )
  })

  it('falha quando um drop referencia collection que nenhum create anterior cria', () => {
    createTempMigration(
      '0001_create_canary.js',
      'migrate((app) => { app.save(new Collection({ name: "_canary_check" })) }, (app) => {})',
    )
    // Tenta remover "canary_check" (sem o _) que não existe no create
    createTempMigration(
      '0002_drop_canary.js',
      'migrate((app) => { const col = app.findCollectionByNameOrId("canary_check"); app.delete(col); }, (app) => {})',
    )
    const res = runCheck()
    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain(
      'tenta remover/referenciar collection "canary_check", mas ela não foi criada',
    )
  })

  it('passa com sequência válida, sem duplicação, sem buracos e com drops consistentes', () => {
    createTempMigration(
      '0001_create_portfolios.js',
      'migrate((app) => { app.save(new Collection({ name: "portfolios" })) }, (app) => {})',
    )
    createTempMigration(
      '0002_create_institutions.js',
      'migrate((app) => { app.save(new Collection({ name: "institutions" })) }, (app) => {})',
    )
    const res = runCheck()
    expect(res.status).toBe(0)
    expect(res.stdout).toContain(
      'Todas as 2 migrations em pocketbase/migrations/ atendem aos critérios',
    )
  })
})
