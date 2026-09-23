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
