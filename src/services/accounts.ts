import pb from '@/lib/pocketbase/client'
import type { InstitutionRecord } from './institutions'

export type AccountType =
  | 'checking'
  | 'investment'
  | 'savings'
  | 'international_checking'
  | 'cash'
  | 'other'

export const ACCOUNT_CURRENCIES = ['BRL', 'USD', 'EUR'] as const
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number]

export interface AccountRecord {
  id: string
  user_id: string
  institution_id: string
  name: string
  account_type: AccountType
  currency: AccountCurrency
  account_number?: string
  agency?: string
  is_active: boolean
  created: string
  updated: string
  expand?: {
    institution_id?: InstitutionRecord
  }
}

export interface CreateAccountPayload {
  institution_id: string
  name: string
  account_type: AccountType
  currency?: AccountCurrency
  account_number?: string
  agency?: string
  is_active?: boolean
}

export interface UpdateAccountPayload {
  institution_id?: string
  name?: string
  account_type?: AccountType
  currency?: AccountCurrency
  account_number?: string
  agency?: string
  is_active?: boolean
}

/**
 * Traduz erros do PocketBase referentes a accounts para mensagens amigáveis em português.
 */
export function translateAccountError(error: unknown): string {
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
        return 'Você já possui uma conta com este nome.'
      }
      return `Nome da conta: ${nameErr}`
    }
    if (data?.institution_id) {
      return 'Selecione uma instituição válida.'
    }
    if (data?.currency) {
      return 'A moeda da conta deve ser BRL, USD ou EUR.'
    }
  }

  const strErr = String(error)
  if (strErr.includes('UNIQUE constraint failed') || strErr.includes('idx_accounts_user_name')) {
    return 'Você já possui uma conta com este nome.'
  }

  return 'Ocorreu um erro ao salvar a conta. Tente novamente.'
}

/**
 * Lista todas as contas do titular autenticado, com a instituição expandida.
 */
export async function listAccounts(): Promise<AccountRecord[]> {
  const records = await pb.collection('accounts').getFullList<AccountRecord>({
    sort: 'name',
    expand: 'institution_id',
  })
  return records
}

/**
 * Cria uma nova conta vinculada ao usuário autenticado e a uma instituição existente.
 */
export async function createAccount(payload: CreateAccountPayload): Promise<AccountRecord> {
  const userId = pb.authStore.record?.id
  if (!userId) {
    throw new Error('Usuário não autenticado.')
  }

  const validCurrency = (payload.currency || 'BRL').toUpperCase() as AccountCurrency
  if (!ACCOUNT_CURRENCIES.includes(validCurrency)) {
    throw new Error('A moeda da conta deve ser BRL, USD ou EUR.')
  }

  try {
    const record = await pb.collection('accounts').create<AccountRecord>(
      {
        ...payload,
        user_id: userId,
        currency: validCurrency,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
      },
      {
        expand: 'institution_id',
      },
    )
    return record
  } catch (err) {
    const userFriendlyMsg = translateAccountError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}

/**
 * Atualiza os dados de uma conta existente.
 */
export async function updateAccount(
  id: string,
  payload: UpdateAccountPayload,
): Promise<AccountRecord> {
  const updateData = { ...payload }
  if (updateData.currency) {
    const validCurrency = updateData.currency.toUpperCase() as AccountCurrency
    if (!ACCOUNT_CURRENCIES.includes(validCurrency)) {
      throw new Error('A moeda da conta deve ser BRL, USD ou EUR.')
    }
    updateData.currency = validCurrency
  }

  try {
    const record = await pb.collection('accounts').update<AccountRecord>(id, updateData, {
      expand: 'institution_id',
    })
    return record
  } catch (err) {
    const userFriendlyMsg = translateAccountError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}

/**
 * Desativa ou ativa uma conta (soft toggle).
 */
export async function toggleAccountActive(
  id: string,
  currentStatus: boolean,
): Promise<AccountRecord> {
  return updateAccount(id, { is_active: !currentStatus })
}
