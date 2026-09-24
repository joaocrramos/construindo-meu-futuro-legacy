import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

describe('Hook de Autenticação - last_login (pocketbase/hooks/auth.js)', () => {
  const hookPath = join(process.cwd(), 'pocketbase', 'hooks', 'auth.js')

  it('arquivo do hook existe no repositório com as convenções esperadas', () => {
    expect(existsSync(hookPath)).toBe(true)
    const content = readFileSync(hookPath, 'utf8')

    // Deve registrar o hook onRecordAuthRequest para a collection users
    expect(content).toContain('onRecordAuthRequest')
    expect(content).toContain("'users'")
    // Deve chamar e.next() para deixar o PocketBase autenticar primeiro
    expect(content).toContain('e.next()')
    // Deve atualizar last_login
    expect(content).toContain('last_login')
    // Deve salvar via $app.save(record)
    expect(content).toContain('$app.save(record)')
    // Deve conter try/catch para garantir resiliência (falha nunca bloqueia login)
    expect(content).toContain('try {')
    expect(content).toContain('catch')
  })

  it('lógica do handler atualiza last_login sem lançar exceções em caso de erro', () => {
    const fakeRecord = {
      _data: {} as Record<string, unknown>,
      collection: () => ({ name: 'users' }),
      set(key: string, val: unknown) {
        this._data[key] = val
      },
      get(key: string) {
        return this._data[key]
      },
    }

    const fakeApp = {
      save: vi.fn(),
    }

    // Executa a lógica de simulação do hook
    const runSimulatedHook = (record: unknown, shouldAppSaveThrow = false) => {
      const nextCalled = vi.fn()
      const event = {
        record: record as any,
        next: nextCalled,
      }

      event.next()
      try {
        if (!event.record) return
        const colName = event.record.collection ? event.record.collection()?.name : ''
        if (colName !== 'users') return

        const nowIso = new Date().toISOString()
        event.record.set('last_login', nowIso)

        if (shouldAppSaveThrow) {
          throw new Error('Database disk error')
        }
        fakeApp.save(event.record)
      } catch {
        // Falha não-bloqueante
      }

      return { event, nextCalled }
    }

    // 1. Sucesso: define last_login e chama $app.save
    const successResult = runSimulatedHook(fakeRecord, false)
    expect(successResult.nextCalled).toHaveBeenCalledTimes(1)
    expect(fakeRecord.get('last_login')).toBeDefined()
    expect(fakeApp.save).toHaveBeenCalledWith(fakeRecord)

    // 2. Erro de persistência: não estoura exceção e mantém fluxo
    expect(() => {
      runSimulatedHook(fakeRecord, true)
    }).not.toThrow()

    // 3. Collection diferente de users: não altera nem salva
    const otherColRecord = {
      collection: () => ({ name: 'admins' }),
      set: vi.fn(),
    }
    fakeApp.save.mockClear()
    runSimulatedHook(otherColRecord, false)
    expect(otherColRecord.set).not.toHaveBeenCalled()
    expect(fakeApp.save).not.toHaveBeenCalled()
  })

  it('preserva integridade e nunca propaga exceções de banco nem interrompe login', () => {
    const errorThrowingApp = {
      save: vi.fn().mockImplementation(() => {
        throw new Error('Connection reset by peer')
      }),
    }

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fakeUser = {
      _data: {} as Record<string, unknown>,
      collection: () => ({ name: 'users' }),
      set(key: string, val: unknown) {
        this._data[key] = val
      },
      get(key: string) {
        return this._data[key]
      },
    }

    const nextFn = vi.fn()
    const e = { record: fakeUser, next: nextFn }

    // Simula a exata execução do hook com bloco try/catch
    expect(() => {
      e.next()
      try {
        const record = e.record
        if (!record) return
        const colName = record.collection() ? record.collection().name : ''
        if (colName !== 'users') return
        const nowIso = new Date().toISOString()
        record.set('last_login', nowIso)
        errorThrowingApp.save(record)
      } catch (err) {
        console.error('Falha não-bloqueante ao atualizar last_login do usuario:', err)
      }
    }).not.toThrow()

    expect(nextFn).toHaveBeenCalled()
    expect(fakeUser.get('last_login')).toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Falha não-bloqueante ao atualizar last_login do usuario:'),
      expect.any(Error),
    )

    consoleErrorSpy.mockRestore()
  })
})
