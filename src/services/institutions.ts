import pb from '@/lib/pocketbase/client'

export type InstitutionType = 'bank' | 'broker' | 'crypto_exchange' | 'international' | 'other'

export interface InstitutionRecord {
  id: string
  user_id: string
  name: string
  code?: string
  institution_type: InstitutionType
  website?: string
  is_active: boolean
  created: string
  updated: string
}

export interface CreateInstitutionPayload {
  name: string
  code?: string
  institution_type: InstitutionType
  website?: string
  is_active?: boolean
}

export interface UpdateInstitutionPayload {
  name?: string
  code?: string
  institution_type?: InstitutionType
  website?: string
  is_active?: boolean
}

/**
 * Traduz erros do PocketBase referentes a institutions para mensagens amigáveis em português.
 */
export function translateInstitutionError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as {
      response?: { data?: Record<string, { message?: string; code?: string }>; message?: string }
    }
    const data = err.response?.data
    if (data?.name) {
      const nameErr = data.name.message || ''
      if (
        nameErr.includes('unique') ||
        nameErr.includes('exist') ||
        data.name.code === 'validation_not_unique'
      ) {
        return 'Você já possui uma instituição com este nome.'
      }
      return `Nome da instituição: ${nameErr}`
    }
  }

  const strErr = String(error)
  if (
    strErr.includes('UNIQUE constraint failed') ||
    strErr.includes('idx_institutions_user_name')
  ) {
    return 'Você já possui uma instituição com este nome.'
  }

  return 'Ocorreu um erro ao salvar a instituição. Tente novamente.'
}

/**
 * Lista todas as instituições do titular autenticado.
 */
export async function listInstitutions(): Promise<InstitutionRecord[]> {
  const records = await pb.collection('institutions').getFullList<InstitutionRecord>({
    sort: 'name',
  })
  return records
}

/**
 * Cria uma nova instituição vinculada ao usuário autenticado.
 */
export async function createInstitution(
  payload: CreateInstitutionPayload,
): Promise<InstitutionRecord> {
  const userId = pb.authStore.record?.id
  if (!userId) {
    throw new Error('Usuário não autenticado.')
  }

  try {
    const record = await pb.collection('institutions').create<InstitutionRecord>({
      ...payload,
      user_id: userId,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    })
    return record
  } catch (err) {
    const userFriendlyMsg = translateInstitutionError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    // Preserva detalhes originais para outros consumidores se necessário
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}

/**
 * Atualiza os dados de uma instituição existente.
 */
export async function updateInstitution(
  id: string,
  payload: UpdateInstitutionPayload,
): Promise<InstitutionRecord> {
  try {
    const record = await pb.collection('institutions').update<InstitutionRecord>(id, payload)
    return record
  } catch (err) {
    const userFriendlyMsg = translateInstitutionError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}

/**
 * Desativa ou ativa uma instituição (soft toggle).
 */
export async function toggleInstitutionActive(
  id: string,
  currentStatus: boolean,
): Promise<InstitutionRecord> {
  return updateInstitution(id, { is_active: !currentStatus })
}
