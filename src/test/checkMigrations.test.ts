import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const repoRoot = process.cwd()
const scriptPath = join(repoRoot, 'scripts', 'check-migrations.mjs')

describe('check:migrations guard script', () => {
  let tempDir: string

  const runCheck = (targetDir: string = tempDir) => {
    try {
      const stdout = execSync(`node "${scriptPath}"`, {
        cwd: repoRoot,
        env: { ...process.env, MIGRATIONS_DIR: targetDir },
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

  const createTempMigration = (fileName: string, content: string) => {
    const filePath = join(tempDir, fileName)
    writeFileSync(filePath, content, 'utf8')
    return filePath
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pb-migrations-test-'))
  })

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
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

  it('não confunde nomes de campos de collection com nome da collection (evita falsos positivos)', () => {
    createTempMigration(
      '0001_create_users_extra.js',
      'migrate((app) => { app.save(new Collection({ name: "portfolios", fields: [{ name: "description", type: "text" }] })) }, (app) => {})',
    )
    // Se "description" fosse equivocadamente capturado como collection, um drop dele passaria. Mas com o regex correto, deve falhar:
    createTempMigration(
      '0002_drop_field_as_col.js',
      'migrate((app) => { const col = app.findCollectionByNameOrId("description"); app.delete(col); }, (app) => {})',
    )
    const res = runCheck()
    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain(
      'tenta remover/referenciar collection "description", mas ela não foi criada',
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
    expect(res.stdout).toContain('Todas as 2 migrations')
  })

  it('permite a transição entre 0010 e ordinais >= 0020 e entre 0020 e 0022', () => {
    createTempMigration(
      '0001_create_users.js',
      'migrate((app) => { app.save(new Collection({ name: "users" })) }, (app) => {})',
    )
    createTempMigration('0020_add_due_date.js', 'migrate((app) => {}, (app) => {})')
    createTempMigration(
      '0022_create_alerts.js',
      'migrate((app) => { app.save(new Collection({ name: "alerts" })) }, (app) => {})',
    )
    // Inicializa a cadeia para 0001..0010
    for (let i = 2; i <= 10; i++) {
      const pad = String(i).padStart(4, '0')
      createTempMigration(`${pad}_mig.js`, 'migrate((app) => {}, (app) => {})')
    }
    const res = runCheck()
    expect(res.status).toBe(0)
    expect(res.stdout).toContain('Todas as 12 migrations')
  })

  it('passa com as migrations reais do projeto incluindo a migration 0024 de reset', () => {
    const res = runCheck(join(repoRoot, 'pocketbase', 'migrations'))
    expect(res.status).toBe(0)
    expect(res.stdout).toContain('atendem aos critérios de governança')
  })
})
