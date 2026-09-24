import pb from '@/lib/pocketbase/client'

export interface ResetDataResponse {
  success: boolean
  deleted_counts: Record<string, number>
}

/**
 * Executa a limpeza total dos dados de negócio via endpoint backend.
 * O backend exige administrador ativo, ALLOW_DATA_RESET=true no servidor e a frase exata.
 */
export async function resetBusinessData(confirmation: string): Promise<ResetDataResponse> {
  const result = await pb.send<ResetDataResponse>('/backend/v1/admin/reset-data', {
    method: 'POST',
    body: { confirmation },
  })
  return result
}
