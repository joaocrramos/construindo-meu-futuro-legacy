import pb from '@/lib/pocketbase/client'

export interface AuditLogRecord {
  id: string
  user_id?: string
  event_type: string
  severity: 'info' | 'warn' | 'critical'
  ip_address?: string
  user_agent?: string
  entity?: string
  entity_id?: string
  summary: string
  details?: Record<string, unknown> | null
  created: string
  updated: string
  expand?: {
    user_id?: {
      id: string
      name?: string
      email?: string
      role?: string
    }
  }
}

export interface ListAuditLogsParams {
  page?: number
  perPage?: number
  eventType?: string
  userId?: string
  severity?: string
  startDate?: string
  endDate?: string
}

export interface ListAuditLogsResponse {
  items: AuditLogRecord[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
}

export async function listAuditLogs(
  params: ListAuditLogsParams = {},
): Promise<ListAuditLogsResponse> {
  const page = params.page || 1
  const perPage = params.perPage || 20

  const filterParts: string[] = []

  if (params.eventType && params.eventType !== 'ALL') {
    filterParts.push(`event_type = "${params.eventType}"`)
  }

  if (params.userId && params.userId !== 'ALL') {
    filterParts.push(`user_id = "${params.userId}"`)
  }

  if (params.severity && params.severity !== 'ALL') {
    filterParts.push(`severity = "${params.severity}"`)
  }

  if (params.startDate) {
    // Começo do dia em ISO UTC
    filterParts.push(`created >= "${params.startDate} 00:00:00.000Z"`)
  }

  if (params.endDate) {
    // Fim do dia em ISO UTC
    filterParts.push(`created <= "${params.endDate} 23:59:59.999Z"`)
  }

  const filter = filterParts.join(' && ')

  const res = await pb.collection('audit_logs').getList<AuditLogRecord>(page, perPage, {
    filter: filter || undefined,
    sort: '-created',
    expand: 'user_id',
    requestKey: null,
  })

  return {
    items: res.items,
    totalItems: res.totalItems,
    totalPages: res.totalPages,
    page: res.page,
    perPage: res.perPage,
  }
}
