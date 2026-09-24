import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Executa pocketbase/migrations/0001_baseline_schema.js contra uma simulação mínima da API de
// migrations do PocketBase e compara o schema resultante com o espelho do banco vivo
// (src/lib/pocketbase/schema.json).

type Field = {
  name: string
  type: string
  required?: boolean
  values?: string[]
  collectionId?: string
}
type Col = {
  id: string
  name: string
  type: string
  listRule?: string | null
  viewRule?: string | null
  createRule?: string | null
  updateRule?: string | null
  deleteRule?: string | null
  fields: FieldList
  indexes: string[]
}
type LiveField = {
  name: string
  type: string
  required: boolean
  selectValues?: string[]
  collectionRef?: string
}
type LiveCol = {
  name: string
  type: string
  apiRules: Record<string, string | null>
  fields: LiveField[]
  indexes: string[]
}

class FieldList {
  a: Field[]
  constructor(a: Field[] = []) {
    this.a = a
  }
  getByName(n: string) {
    return this.a.find((f) => f.name === n)
  }
  add(f: Field) {
    this.a.push(f)
  }
  removeByName(n: string) {
    this.a = this.a.filter((f) => f.name !== n)
  }
}

function runBaseline() {
  let seq = 0
  class Collection {
    constructor(d: Omit<Col, 'id' | 'fields'> & { fields?: Field[] }) {
      Object.assign(this, d)
      const self = this as unknown as Col
      self.id = d.name === 'users' ? '_pb_users_auth_' : `c${++seq}`
      self.fields = new FieldList((d.fields || []).map((f) => ({ ...f })))
      self.indexes = [...(d.indexes || [])]
    }
  }
  const fieldClass = (type: string) =>
    class {
      constructor(o: object) {
        Object.assign(this, o, { type })
      }
    }

  const db = new Map<string, Col>()
  const users = new Collection({
    name: 'users',
    type: 'auth',
    fields: [
      { name: 'name', type: 'text' },
      { name: 'avatar', type: 'file' },
      { name: 'created', type: 'autodate' },
      { name: 'updated', type: 'autodate' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)',
      "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''",
    ],
  }) as unknown as Col
  db.set('users', users)

  const find = (key: string) => {
    for (const c of db.values()) if (c.name === key || c.id === key) return c
    throw new Error(`collection não encontrada: ${key}`)
  }
  const app = {
    hasTable: (n: string) => db.has(n),
    findCollectionByNameOrId: find,
    save: (c: Col) => {
      for (const f of c.fields.a) if (f.type === 'relation') find(f.collectionId!)
      db.set(c.name, c)
    },
    delete: (c: Col) => db.delete(c.name),
  }

  let up: ((a: typeof app) => void) | undefined
  let down: ((a: typeof app) => void) | undefined
  const migrate = (u: typeof up, d: typeof down) => {
    up = u
    down = d
  }
  const source = readFileSync(
    join(process.cwd(), 'pocketbase', 'migrations', '0001_baseline_schema.js'),
    'utf8',
  )
  new Function(
    'migrate',
    'Collection',
    'SelectField',
    'BoolField',
    'TextField',
    'DateField',
    'RelationField',
    source,
  )(
    migrate,
    Collection,
    fieldClass('select'),
    fieldClass('bool'),
    fieldClass('text'),
    fieldClass('date'),
    fieldClass('relation'),
  )
  return { app, db, find, up: up!, down: down! }
}

const live = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'lib', 'pocketbase', 'schema.json'), 'utf8'),
) as { collections: LiveCol[] }

// Diferença intencional da baseline em relação ao banco antigo: o frontend oferece 'international'
const INTENTIONAL = 'assets.asset_class'

describe('Baseline de migrations (pocketbase/migrations/0001_baseline_schema.js)', () => {
  it('reproduz o schema do banco vivo (collections, campos, relações, enums, índices e regras)', () => {
    const { app, db, find, up } = runBaseline()
    up(app)

    const diffs: string[] = []
    const names = new Set([...live.collections.map((c) => c.name), ...db.keys()])
    for (const name of names) {
      const l = live.collections.find((c) => c.name === name)
      const b = db.get(name)
      if (!l || !b) {
        diffs.push(`collection ${name} só existe no ${l ? 'banco vivo' : 'baseline'}`)
        continue
      }
      const describeLive = (f: LiveField) =>
        JSON.stringify([f.type, !!f.required, f.selectValues ?? null, f.collectionRef ?? null])
      const describeBaseline = (f: Field) =>
        JSON.stringify([
          f.type,
          !!f.required,
          f.values ?? null,
          f.collectionId ? find(f.collectionId).name : null,
        ])
      const lf = new Map(l.fields.map((f) => [f.name, describeLive(f)]))
      const bf = new Map(b.fields.a.map((f) => [f.name, describeBaseline(f)]))
      for (const field of new Set([...lf.keys(), ...bf.keys()])) {
        if (lf.get(field) !== bf.get(field)) diffs.push(`${name}.${field}`)
      }
      if (JSON.stringify([...l.indexes].sort()) !== JSON.stringify([...b.indexes].sort())) {
        diffs.push(`${name} (índices)`)
      }
      const rules = {
        list: b.listRule,
        view: b.viewRule,
        create: b.createRule,
        update: b.updateRule,
        delete: b.deleteRule,
      }
      for (const [rule, value] of Object.entries(rules)) {
        if ((l.apiRules[rule] || null) !== (value || null)) diffs.push(`${name} (regra ${rule})`)
      }
    }

    expect(diffs.filter((d) => d !== INTENTIONAL)).toEqual([])
    const assetClass = db.get('assets')!.fields.getByName('asset_class')!
    expect(assetClass.values).toContain('international')
  })

  it('é idempotente e o down remove tudo o que criou', () => {
    const { app, db, up, down } = runBaseline()
    up(app)
    const afterFirst = JSON.stringify([...db.keys()])
    up(app)
    expect(JSON.stringify([...db.keys()])).toBe(afterFirst)

    down(app)
    expect([...db.keys()]).toEqual(['users'])
    expect(db.get('users')!.fields.a.map((f) => f.name)).toEqual([
      'name',
      'avatar',
      'created',
      'updated',
    ])
  })
})
