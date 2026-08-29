import { describe, it, expect } from 'vitest'
import { parseAppError } from '@/lib/errorHandler'
import { ClientResponseError } from 'pocketbase'

describe('Centralized Error Handler (parseAppError)', () => {
  it('deve mapear erro 400 em mensagem amigável de dados inválidos', () => {
    const pbError = new ClientResponseError({
      status: 400,
      response: { message: 'Failed to create', data: { email: { message: 'Invalid email' } } },
    })
    const parsed = parseAppError(pbError)
    expect(parsed.statusCode).toBe(400)
    expect(parsed.title).toBe('Dados inválidos')
    expect(parsed.fieldErrors?.email).toBe('Invalid email')
  })

  it('deve mapear erro 401 em sessão expirada / não autenticado', () => {
    const pbError = new ClientResponseError({ status: 401 })
    const parsed = parseAppError(pbError)
    expect(parsed.statusCode).toBe(401)
    expect(parsed.title).toBe('Não autenticado')
  })

  it('deve mapear erro 403 em acesso negado sem expor internals', () => {
    const pbError = new ClientResponseError({ status: 403 })
    const parsed = parseAppError(pbError)
    expect(parsed.statusCode).toBe(403)
    expect(parsed.title).toBe('Acesso negado')
  })

  it('deve mapear erro 500 em instabilidade temporária', () => {
    const pbError = new ClientResponseError({ status: 500 })
    const parsed = parseAppError(pbError)
    expect(parsed.statusCode).toBe(500)
    expect(parsed.title).toBe('Instabilidade temporária')
  })

  it('deve tratar exceção genérica e erro de rede', () => {
    const netError = new Error('Failed to fetch')
    const parsed = parseAppError(netError)
    expect(parsed.title).toBe('Falha de conexão')
  })
})
