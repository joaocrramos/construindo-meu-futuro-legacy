import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AdminAuditPage from '@/pages/admin/Audit'
import * as auditService from '@/services/auditLogs'

// Mock do PocketBase Client
vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    authStore: {
      token: 'fake-token',
      record: { id: 'admin-id', role: 'admin' },
      isValid: true,
    },
    collection: vi.fn(() => ({
      getFullList: vi
        .fn()
        .mockResolvedValue([
          { id: 'usr-1', name: 'João Carlos', email: 'joao.carlos@jcrtecnologia.com' },
        ]),
      getList: vi.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
        totalPages: 1,
        page: 1,
        perPage: 15,
      }),
    })),
  },
}))

vi.mock('@/services/auditLogs', () => ({
  listAuditLogs: vi.fn(),
}))

describe('AdminAuditPage', () => {
  it('deve renderizar o cabeçalho de trilha de auditoria e lista de eventos', async () => {
    vi.mocked(auditService.listAuditLogs).mockResolvedValue({
      items: [
        {
          id: 'log-1',
          event_type: 'BACKUP_CREATED',
          severity: 'info',
          summary: 'Backup manual criado com sucesso: backup_teste.zip',
          created: '2026-09-23T10:00:00Z',
          updated: '2026-09-23T10:00:00Z',
        },
      ],
      totalItems: 1,
      totalPages: 1,
      page: 1,
      perPage: 15,
    })

    render(<AdminAuditPage />)

    expect(screen.getByText(/Trilha de Auditoria & Governança/i)).not.toBeNull()
    expect(screen.getByText(/Filtros de Trilha/i)).not.toBeNull()

    await waitFor(() => {
      expect(screen.getByText(/Backup manual criado com sucesso: backup_teste.zip/i)).not.toBeNull()
    })
  })

  it('deve exibir os filtros de auditoria disponíveis', async () => {
    vi.mocked(auditService.listAuditLogs).mockResolvedValue({
      items: [],
      totalItems: 0,
      totalPages: 1,
      page: 1,
      perPage: 15,
    })

    render(<AdminAuditPage />)

    expect(screen.getByText(/Tipo de Evento/i)).not.toBeNull()
    expect(screen.getByText(/Severidade/i)).not.toBeNull()
    expect(screen.getByText(/Usuário Responsável/i)).not.toBeNull()
  })
})
