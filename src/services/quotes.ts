import pb from '@/lib/pocketbase/client'

export interface QuoteRecord {
  id: string
  ticker: string
  price_cents: number
  currency: string
  quoted_at?: string
  change_percent?: number
  source?: string
  raw_data?: Record<string, unknown>
  created: string
  updated: string
}

export interface RefreshQuotesResponse {
  success: boolean
  updated_count: number
  tickers_count: number
  errors?: string[]
  message?: string
}

/**
 * Lista todas as cotações salvas na collection quotes.
 */
export async function listQuotes(): Promise<QuoteRecord[]> {
  try {
    const records = await pb.collection('quotes').getFullList<QuoteRecord>({
      sort: 'ticker',
    })
    return records
  } catch (err: unknown) {
    // Se a collection ainda não tiver sido criada ou vazia, retorna array vazio graciosamente
    console.warn('Falha ao listar cotações de quotes:', err)
    return []
  }
}

/**
 * Dispara atualização de cotações sob demanda via hook no backend.
 */
export async function refreshQuotes(): Promise<RefreshQuotesResponse> {
  const response = await pb.send<RefreshQuotesResponse>('/backend/v1/quotes/refresh', {
    method: 'POST',
  })
  return response
}

/**
 * Obtém a cotação de um ticker específico a partir da lista em cache ou do banco.
 */
export function getQuoteForTicker(quotes: QuoteRecord[], ticker: string): QuoteRecord | undefined {
  if (!ticker) return undefined
  const normalized = ticker.trim().toUpperCase()
  return quotes.find((q) => q.ticker.toUpperCase() === normalized)
}

/**
 * Utilitário para obter a taxa de câmbio (em decimal) para conversão para BRL.
 * Suporta USD-BRL e EUR-BRL. Retorna undefined se não encontrada.
 */
export function getExchangeRateToBRL(quotes: QuoteRecord[], currency: string): number | undefined {
  const normCurr = (currency || '').trim().toUpperCase()
  if (normCurr === 'BRL') return 1

  const pairKey = `${normCurr}-BRL`
  const quote = quotes.find(
    (q) => q.ticker.toUpperCase() === pairKey || q.ticker.toUpperCase() === `${normCurr}/BRL`,
  )

  if (quote && quote.price_cents > 0) {
    return quote.price_cents / 100
  }

  return undefined
}
