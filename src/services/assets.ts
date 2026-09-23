import pb from '@/lib/pocketbase/client'

export type AssetClass =
  | 'fixed_income'
  | 'equities'
  | 'real_estate_funds'
  | 'mutual_funds'
  | 'crypto'
  | 'cash_equivalent'
  | 'international'
  | 'other'

export interface AssetRecord {
  id: string
  user_id: string
  ticker: string
  name: string
  asset_class: AssetClass
  sub_type?: string
  currency: string
  cnpj_issuer?: string
  issuer?: string
  due_date?: string
  indexer_rate?: string
  is_active: boolean
  created: string
  updated: string
}

export interface CreateAssetPayload {
  ticker: string
  name: string
  asset_class: AssetClass
  sub_type?: string
  currency?: string
  cnpj_issuer?: string
  issuer?: string
  due_date?: string
  indexer_rate?: string
  is_active?: boolean
}

export interface UpdateAssetPayload {
  ticker?: string
  name?: string
  asset_class?: AssetClass
  sub_type?: string
  currency?: string
  cnpj_issuer?: string
  issuer?: string
  due_date?: string
  indexer_rate?: string
  is_active?: boolean
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  fixed_income: 'Renda Fixa',
  equities: 'Ações / Ações Globais',
  real_estate_funds: 'Fundos Imobiliários (FII)',
  mutual_funds: 'Fundos de Investimento',
  crypto: 'Criptoativos',
  cash_equivalent: 'Equivalente de Caixa',
  international: 'Internacional (Stocks / REITs)',
  other: 'Outro',
}

/**
 * Categorias ou subtipos comuns de Renda Fixa no mercado brasileiro (padrão Investidor10).
 */
export const FIXED_INCOME_SUBTYPES = [
  'CDB',
  'LCI',
  'LCA',
  'CRI',
  'CRA',
  'LC',
  'LF',
  'RDB',
  'Debênture',
  'CCB',
  'Tesouro Selic',
  'Tesouro IPCA+',
  'Tesouro Prefixado',
  'Tesouro RendA+',
  'Tesouro Educa+',
  'Tesouro Direto',
  'Outro Título de Renda Fixa',
] as const

/**
 * Subtipos ou categorias comuns para outras classes de ativo (FIIs, Ações, Fundos, Cripto).
 */
export const ASSET_SUBTYPES_BY_CLASS: Partial<Record<AssetClass, readonly string[]>> = {
  fixed_income: FIXED_INCOME_SUBTYPES,
  equities: ['Ações Ordinárias (ON)', 'Ações Preferenciais (PN)', 'Units', 'BDR', 'ETF de Ações'],
  real_estate_funds: [
    'Tijolo',
    'Papel (CRI)',
    'Fiagro',
    'Fundo de Fundos (FoF)',
    'Desenvolvimento',
  ],
  mutual_funds: [
    'Fundo Multimercado',
    'Fundo de Ações',
    'Fundo Cambial',
    'Fundo de Renda Fixa',
    'Fundo de Previdência',
  ],
  crypto: ['Criptomoeda', 'Stablecoin', 'Token DeFi', 'Outro Criptoativo'],
  cash_equivalent: ['Reserva de Emergência', 'Conta Remunerada', 'Fundo DI'],
  international: ['Stocks (Ações EUA)', 'REITs', 'ETF Internacional', 'Outro Internacional'],
}

/**
 * Indexadores financeiros típicos de Renda Fixa no Brasil.
 */
export const FIXED_INCOME_INDEXERS = [
  '% do CDI',
  'CDI + Taxa Fixa',
  'IPCA + Taxa Fixa',
  'Prefixado',
  'Selic + Taxa Fixa',
  'IGP-M + Taxa Fixa',
  'TR (Taxa Referencial)',
] as const

/**
 * Traduz erros do PocketBase referentes a assets para mensagens amigáveis em português.
 */
export function translateAssetError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as {
      response?: { data?: Record<string, { message?: string; code?: string }>; message?: string }
    }
    const data = err.response?.data
    if (data?.ticker) {
      const tickerErr = data.ticker.message || ''
      if (
        tickerErr.includes('unique') ||
        tickerErr.includes('exist') ||
        data.ticker.code === 'validation_not_unique'
      ) {
        return 'Você já possui um ativo com este ticker.'
      }
      return `Código/Ticker do ativo: ${tickerErr}`
    }
    if (data?.name) {
      return `Nome do ativo: ${data.name.message || 'inválido'}`
    }
  }

  const strErr = String(error)
  if (strErr.includes('UNIQUE constraint failed') || strErr.includes('idx_assets_user_ticker')) {
    return 'Você já possui um ativo com este ticker.'
  }

  return 'Ocorreu um erro ao salvar o ativo. Tente novamente.'
}

/**
 * Lista todos os ativos do titular autenticado.
 */
export async function listAssets(): Promise<AssetRecord[]> {
  const records = await pb.collection('assets').getFullList<AssetRecord>({
    sort: 'ticker',
  })
  return records
}

/**
 * Cria um novo ativo no catálogo do usuário autenticado.
 */
export async function createAsset(payload: CreateAssetPayload): Promise<AssetRecord> {
  const userId = pb.authStore.record?.id
  if (!userId) {
    throw new Error('Usuário não autenticado.')
  }

  try {
    const record = await pb.collection('assets').create<AssetRecord>({
      ...payload,
      user_id: userId,
      ticker: payload.ticker.trim().toUpperCase(),
      name: payload.name.trim(),
      currency: (payload.currency || 'BRL').trim().toUpperCase(),
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    })
    return record
  } catch (err) {
    const userFriendlyMsg = translateAssetError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}

/**
 * Atualiza um ativo existente.
 */
export async function updateAsset(id: string, payload: UpdateAssetPayload): Promise<AssetRecord> {
  try {
    const cleanPayload: Partial<UpdateAssetPayload> = { ...payload }
    if (cleanPayload.ticker) cleanPayload.ticker = cleanPayload.ticker.trim().toUpperCase()
    if (cleanPayload.name) cleanPayload.name = cleanPayload.name.trim()
    if (cleanPayload.currency) cleanPayload.currency = cleanPayload.currency.trim().toUpperCase()

    const record = await pb.collection('assets').update<AssetRecord>(id, cleanPayload)
    return record
  } catch (err) {
    const userFriendlyMsg = translateAssetError(err)
    const enhancedErr = new Error(userFriendlyMsg)
    ;(enhancedErr as unknown as { original: unknown }).original = err
    throw enhancedErr
  }
}

/**
 * Alterna status ativo/inativo de um ativo.
 */
export async function toggleAssetActive(id: string, currentStatus: boolean): Promise<AssetRecord> {
  return updateAsset(id, { is_active: !currentStatus })
}
