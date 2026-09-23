import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminAuditPage from '@/pages/admin/Audit'
import * as auditService from '@/services/auditLogs'
import * as backupService from '@/services/backups'
import pb from '@/lib/pocketbase/client'

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

vi.mock('@/services/backups', () => ({
  listBackups: vi.fn(),
  createBackup: vi.fn(),
}))

describe('AdminAuditPage', () => {
  it('deve renderizar o cabeçalho de auditoria e governança B2', async () => {
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

    expect(screen.getByText(/Trilha de Auditoria & Governança \(B2\)/i)).not.toBeNull()
    expect(screen.getByText(/Logs de Auditoria/i)).not.toBeNull()
    expect(screen.getByText(/Backups & Restore B2/i)).not.toBeNull()

    await waitFor(() => {
      expect(screen.getByText(/Backup manual criado com sucesso/i)).not.toBeNull()
    })
  })

  it('deve alternar para a aba de Backups e exibir itens existentes', async () => {
    vi.mocked(auditService.listAuditLogs).mockResolvedValue({
      items: [],
      totalItems: 0,
      totalPages: 1,
      page: 1,
      perPage: 15,
    })

    vi.mocked(backupService.listBackups).mockResolvedValue({
      items: [
        {
          key: 'backup_20260923_snapshot.zip',
          size: 1048576,
          modified: '2026-09-23T10:15:00Z',
        },
      ],
      total: 1,
    })

    render(<AdminAuditPage />)

    const backupsTab = screen.getByRole('tab', { name: /Backups & Restore B2/i })
    fireEvent.click(backupsTab)

    await waitFor(() => {
      expect(screen.getByText('backup_20260923_snapshot.zip')).not.toBeNull()
      expect(screen.getByText(/1 MB/i)).not.toBeNull()
    })
  })
})
