import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Executa o arquivo real pocketbase/hooks/admin_reset.js com os globais do PocketBase simulados
// e devolve o handler registrado em routerAdd.
const hookSource = readFileSync(
  join(process.cwd(), 'pocketbase', 'hooks', 'admin_reset.js'),
  'utf8',
)

type Handler = (e: unknown) => { status: number; body: Record<string, unknown> }

interface FakeDb {
  tables: Record<string, number>
  executed: string[]
  savedLogs: Record<string, unknown>[]
  failOn?: string
}

function loadHandler(env: Record<string, string>, db: FakeDb) {
  let handler: Handler | undefined
  const routerAdd = vi.fn((method: string, path: string, fn: Handler) => {
    expect(method).toBe('POST')
    expect(path).toBe('/backend/v1/admin/reset-data')
    handler = fn
  })
  const $os = { getenv: (k: string) => env[k] || '' }
  class Record {
    data: { [key: string]: unknown } = {}
    set(k: string, v: unknown) {
      this.data[k] = v
    }
  }
  const txApp = {
    hasTable: (n: string) => n in db.tables,
    countRecords: (n: string) => db.tables[n],
    db: () => ({
      newQuery: (sql: string) => ({
        execute: () => {
          if (db.failOn && sql.includes(db.failOn)) throw new Error('disk I/O error')
          db.executed.push(sql)
        },
      }),
    }),
    findCollectionByNameOrId: (n: string) => ({ name: n }),
    save: (r: Record) => db.savedLogs.push(r.data),
  }
  const $app = {
    runInTransaction: (fn: (tx: typeof txApp) => void) => {
      const snapshot = [...db.executed]
      try {
        fn(txApp)
      } catch (err) {
        db.executed = snapshot
        db.savedLogs = []
        throw err
      }
    },
  }
  new Function('routerAdd', '$os', '$app', 'Record', hookSource)(routerAdd, $os, $app, Record)
  return handler!
}

function makeEvent(auth: { role: string; status: string } | null, body: unknown) {
  return {
    auth: auth && {
      id: 'admin-id',
      getString: (k: string) => (({ ...auth, email: 'admin@example.com' }) as never)[k] ?? '',
    },
    requestInfo: () => ({ body }),
    json: (status: number, b: Record<string, unknown>) => ({ status, body: b }),
  }
}

const PHRASE = 'LIMPAR AMBIENTE DESENVOLVIMENTO'
const ADMIN = { role: 'admin', status: 'active' }

describe('Rota de limpeza da base (pocketbase/hooks/admin_reset.js)', () => {
  let db: FakeDb

  beforeEach(() => {
    db = {
      tables: { alerts: 1, movements: 4, accounts: 2, audit_logs: 7, positions: 0 },
      executed: [],
      savedLogs: [],
    }
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('recusa quem não é administrador ativo', () => {
    const handler = loadHandler({ ALLOW_DATA_RESET: 'true' }, db)
    expect(handler(makeEvent(null, { confirmation: PHRASE })).status).toBe(403)
    expect(
      handler(makeEvent({ role: 'user', status: 'active' }, { confirmation: PHRASE })).status,
    ).toBe(403)
    expect(
      handler(makeEvent({ role: 'admin', status: 'suspended' }, { confirmation: PHRASE })).status,
    ).toBe(403)
    expect(db.executed).toEqual([])
  })

  it('recusa quando ALLOW_DATA_RESET não está habilitado no servidor', () => {
    const handler = loadHandler({}, db)
    const res = handler(makeEvent(ADMIN, { confirmation: PHRASE }))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('RESET_DISABLED')
    expect(db.executed).toEqual([])
  })

  it('recusa frase de confirmação incorreta', () => {
    const handler = loadHandler({ ALLOW_DATA_RESET: 'true' }, db)
    const res = handler(makeEvent(ADMIN, { confirmation: 'limpar' }))
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_CONFIRMATION')
    expect(db.executed).toEqual([])
  })

  it('limpa as collections existentes, preserva users e registra SYSTEM_RESET com as contagens', () => {
    const handler = loadHandler({ ALLOW_DATA_RESET: 'true' }, db)
    const res = handler(makeEvent(ADMIN, { confirmation: PHRASE }))

    expect(res.status).toBe(200)
    expect(res.body.deleted_counts).toEqual({
      alerts: 1,
      movements: 4,
      positions: 0,
      accounts: 2,
      audit_logs: 7,
    })
    expect(db.executed).toEqual([
      'DELETE FROM alerts',
      'DELETE FROM movements',
      'DELETE FROM positions',
      'DELETE FROM accounts',
      'DELETE FROM audit_logs',
    ])
    expect(db.executed.some((sql) => sql.includes('users'))).toBe(false)
    expect(db.savedLogs).toHaveLength(1)
    expect(db.savedLogs[0]).toMatchObject({
      user_id: 'admin-id',
      event_type: 'SYSTEM_RESET',
      severity: 'critical',
    })
    expect(db.savedLogs[0].details).toMatchObject({
      preserved_collections: ['users'],
      authorized_by: 'admin@example.com',
    })
  })

  it('não aplica nada quando uma exclusão falha no meio da transação', () => {
    db.failOn = 'accounts'
    const handler = loadHandler({ ALLOW_DATA_RESET: 'true' }, db)
    const res = handler(makeEvent(ADMIN, { confirmation: PHRASE }))

    expect(res.status).toBe(500)
    expect(res.body.code).toBe('RESET_FAILED')
    expect(db.executed).toEqual([])
    expect(db.savedLogs).toEqual([])
  })
})
