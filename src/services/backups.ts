import pb from '@/lib/pocketbase/client'

export interface BackupItem {
  key: string
  size: number
  modified: string
}

export interface ListBackupsResponse {
  items: BackupItem[]
  total: number
}

export interface CreateBackupResponse {
  success: boolean
  name: string
  message: string
}

export async function listBackups(): Promise<ListBackupsResponse> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl

  const res = await fetch(`${baseUrl}/backend/v1/backups`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || `Erro ao listar backups (HTTP ${res.status})`)
  }

  return res.json()
}

export async function createBackup(customName?: string): Promise<CreateBackupResponse> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl

  const res = await fetch(`${baseUrl}/backend/v1/backups`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customName ? { name: customName } : {}),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || `Erro ao criar backup (HTTP ${res.status})`)
  }

  return res.json()
}

export async function downloadBackup(key: string): Promise<Blob> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl

  const cleanKey = key?.trim()
  if (!cleanKey) {
    throw new Error('Chave de snapshot inválida.')
  }

  const res = await fetch(
    `${baseUrl}/backend/v1/backups/${encodeURIComponent(cleanKey)}/download`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!res.ok) {
    let errorMessage = `Erro ao baixar backup (HTTP ${res.status})`
    try {
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errorData = await res.json()
        if (errorData.code === 'BACKUP_NOT_FOUND') {
          errorMessage = 'Backup não encontrado.'
        } else if (errorData.code === 'UNAUTHORIZED') {
          errorMessage = 'Apenas administradores podem baixar arquivos de backup.'
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } else {
        const text = await res.text()
        if (text) {
          errorMessage = text
        }
      }
    } catch (_) {
      // Usar a mensagem padrão com status se não conseguir ler
    }

    if (res.status === 404 && errorMessage.startsWith('Erro ao')) {
      errorMessage = 'Backup não encontrado.'
    }

    throw new Error(errorMessage)
  }

  return res.blob()
}
