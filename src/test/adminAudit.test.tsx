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
  downloadBackup: vi.fn(),
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

  it('deve permitir disparar o download de um snapshot com sucesso', async () => {
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
          key: 'backup_20260923_download_test.zip',
          size: 2048576,
          modified: '2026-09-23T11:00:00Z',
        },
      ],
      total: 1,
    })

    const fakeBlob = new Blob(['fake zip content'], { type: 'application/zip' })
    vi.mocked(backupService.downloadBackup).mockResolvedValue(fakeBlob)

    // Mock de window.URL.createObjectURL e revokeObjectURL
    const createObjectURLMock = vi.fn(() => 'blob:http://localhost/fake-blob-url')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    render(<AdminAuditPage />)

    const backupsTab = screen.getByRole('tab', { name: /Backups & Restore B2/i })
    fireEvent.click(backupsTab)

    await waitFor(() => {
      expect(screen.getByText('backup_20260923_download_test.zip')).not.toBeNull()
    })

    const downloadButton = screen.getByRole('button', { name: /Baixar/i })
    expect(downloadButton).not.toBeNull()
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(backupService.downloadBackup).toHaveBeenCalledWith('backup_20260923_download_test.zip')
      expect(createObjectURLMock).toHaveBeenCalledWith(fakeBlob)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/fake-blob-url')
    })
  })
})
