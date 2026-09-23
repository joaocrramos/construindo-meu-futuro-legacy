import pb from '@/lib/pocketbase/client'

export interface PortfolioRecord {
  id: string
  user_id: string
  name: string
  description?: string
  color?: string
  is_archived?: boolean
  target_amount_cents?: number
  created: string
  updated: string
}

export async function listPortfolios(): Promise<PortfolioRecord[]> {
  try {
    const records = await pb.collection('portfolios').getFullList<PortfolioRecord>({
      sort: 'name',
    })
    return records
  } catch (err) {
    console.error('Falha ao listar carteiras:', err)
    return []
  }
}
