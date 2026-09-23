import pb from '@/lib/pocketbase/client'

export type AlertType = 'maturity_upcoming' | 'maturity_today' | 'balance_negative' | 'system'
export type AlertSeverity = 'info' | 'warn' | 'critical'

export interface AlertRecord {
  id: string
  user_id: string
  type: AlertType
  title: string
  message: string
  severity: AlertSeverity
  reference_id?: string
  due_date?: string
  is_read: boolean
  created: string
  updated: string
}

export interface ListAlertsParams {
  type?: AlertType | 'all'
  isRead?: boolean | 'all'
  page?: number
  perPage?: number
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  maturity_upcoming: 'Vencimento Próximo',
  maturity_today: 'Vencimento Hoje',
  balance_negative: 'Saldo Negativo',
  system: 'Sistema',
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Informativo',
  warn: 'Atenção',
  critical: 'Crítico',
}

/**
 * Lista alertas do usuário autenticado com filtros opcionais de status de leitura e tipo.
 */
export async function listAlerts(params?: ListAlertsParams): Promise<AlertRecord[]> {
  const filterParts: string[] = []

  if (params?.type && params.type !== 'all') {
    filterParts.push(`type = "${params.type}"`)
  }

  if (params?.isRead !== undefined && params.isRead !== 'all') {
    filterParts.push(`is_read = ${params.isRead}`)
  }

  const filter = filterParts.join(' && ')

  const records = await pb.collection('alerts').getFullList<AlertRecord>({
    filter: filter || undefined,
    sort: '-created',
  })

  return records
}

/**
 * Marca um alerta específico como lido ou não lido.
 */
export async function markAlertRead(alertId: string, isRead = true): Promise<AlertRecord> {
  const updated = await pb.collection('alerts').update<AlertRecord>(alertId, {
    is_read: isRead,
  })
  return updated
}

/**
 * Marca todos os alertas não-lidos como lidos.
 */
export async function markAllAlertsRead(alerts: AlertRecord[]): Promise<void> {
  const unreadAlerts = alerts.filter((a) => !a.is_read)
  if (unreadAlerts.length === 0) return

  await Promise.all(
    unreadAlerts.map((alert) =>
      pb.collection('alerts').update(alert.id, {
        is_read: true,
      }),
    ),
  )
}

/**
 * Executa verificação manual de alertas via endpoint backend (útil para desenvolvimento ou testes).
 */
export async function triggerAlertsCheck(): Promise<{
  success: boolean
  alerts_created: number
  users_affected: number
  date: string
}> {
  const res = await pb.send('/backend/v1/alerts/run-check', {
    method: 'POST',
  })
  return res as {
    success: boolean
    alerts_created: number
    users_affected: number
    date: string
  }
}
