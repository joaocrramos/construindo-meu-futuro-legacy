import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminBackupsPage from '@/pages/admin/Backups'
import * as backupService from '@/services/backups'

// Mock do PocketBase Client
vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    authStore: {
      token: 'fake-token',
      record: { id: 'admin-id', role: 'admin' },
      isValid: true,
    },
    baseUrl: 'https://construindo-meu-futuro-62c22.shrd00.internal.goskip.dev',
  },
}))

vi.mock('@/services/backups', () => ({
  listBackups: vi.fn(),
  createBackup: vi.fn(),
  downloadBackup: vi.fn(),
  restoreBackup: vi.fn(),
}))

describe('AdminBackupsPage', () => {
  it('deve renderizar a página de Backup & Recuperação (B2) com snapshots', async () => {
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

    render(<AdminBackupsPage />)

    expect(screen.getByText(/Backup & Recuperação \(B2\)/i)).not.toBeNull()
    expect(screen.getByText(/Mecanismo de Backup & Snapshot PocketBase \(B2\)/i)).not.toBeNull()

    await waitFor(() => {
      expect(screen.getByText('backup_20260923_snapshot.zip')).not.toBeNull()
      expect(screen.getByText(/1 MB/i)).not.toBeNull()
      expect(
        screen.getByRole('button', { name: /Baixar backup_20260923_snapshot\.zip/i }),
      ).not.toBeNull()
      expect(
        screen.getByRole('button', { name: /Restaurar backup_20260923_snapshot\.zip/i }),
      ).not.toBeNull()
    })
  })

  it('deve permitir disparar o download de um snapshot', async () => {
    vi.mocked(backupService.listBackups).mockResolvedValue({
      items: [
        {
          key: 'backup_download.zip',
          size: 2048576,
          modified: '2026-09-23T11:00:00Z',
        },
      ],
      total: 1,
    })

    const fakeBlob = new Blob(['fake zip content'], { type: 'application/zip' })
    vi.mocked(backupService.downloadBackup).mockResolvedValue(fakeBlob)

    const createObjectURLMock = vi.fn(() => 'blob:http://localhost/fake-blob-url')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    render(<AdminBackupsPage />)

    await waitFor(() => {
      expect(screen.getByText('backup_download.zip')).not.toBeNull()
    })

    const downloadButton = screen.getByRole('button', { name: /Baixar backup_download\.zip/i })
    fireEvent.click(downloadButton)

    await waitFor(() => {
      expect(backupService.downloadBackup).toHaveBeenCalledWith('backup_download.zip')
      expect(createObjectURLMock).toHaveBeenCalledWith(fakeBlob)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/fake-blob-url')
    })
  })

  it('deve abrir modal de confirmação de alto atrito ao clicar em Restaurar e validar a digitação do snapshot', async () => {
    vi.mocked(backupService.listBackups).mockResolvedValue({
      items: [
        {
          key: 'testeb2.zip',
          size: 512000,
          modified: '2026-09-23T12:00:00Z',
        },
      ],
      total: 1,
    })

    vi.mocked(backupService.restoreBackup).mockResolvedValue({
      success: true,
      key: 'testeb2.zip',
      message: 'Comando de restauração executado com sucesso.',
    })

    render(<AdminBackupsPage />)

    await waitFor(() => {
      expect(screen.getByText('testeb2.zip')).not.toBeNull()
    })

    const restoreButton = screen.getByRole('button', { name: /Restaurar testeb2\.zip/i })
    fireEvent.click(restoreButton)

    // Modal deve abrir com aviso de ação destrutiva
    await waitFor(() => {
      expect(screen.getByText(/Confirmar Restauração de Snapshot/i)).not.toBeNull()
      expect(screen.getByText(/ATENÇÃO: ESTA AÇÃO É DESTRUTIVA E IRREVERSÍVEL!/i)).not.toBeNull()
    })

    const confirmButton = screen.getByRole('button', { name: /Confirmar Restauração/i })
    // O botão deve estar desabilitado antes de digitar a chave exata
    expect(confirmButton.hasAttribute('disabled')).toBe(true)

    const input = screen.getByPlaceholderText('testeb2.zip')
    fireEvent.change(input, { target: { value: 'errado.zip' } })
    expect(confirmButton.hasAttribute('disabled')).toBe(true)

    fireEvent.change(input, { target: { value: 'testeb2.zip' } })
    expect(confirmButton.hasAttribute('disabled')).toBe(false)

    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(backupService.restoreBackup).toHaveBeenCalledWith('testeb2.zip')
    })
  })
})
