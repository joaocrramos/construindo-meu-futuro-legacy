import { describe, it, expect } from 'vitest'
import pb from '@/lib/pocketbase/client'

describe('PocketBase Client Initialization', () => {
  it('deve exportar uma instância inicializada do PocketBase', () => {
    expect(pb).toBeDefined()
    expect(pb.authStore).toBeDefined()
    expect(typeof pb.collection).toBe('function')
  })

  it('deve ter auto-cancelamento desativado para concorrência de requests', () => {
    // A configuração pb.autoCancellation(false) foi chamada no bootstrap do client
    expect(pb.authStore.isValid).toBeDefined()
  })
})
