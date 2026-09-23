import pb from '@/lib/pocketbase/client'

export interface InvitationRecord {
  id: string
  email: string
  role: 'admin' | 'user'
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  invited_by?: string
  expires_at: string
  accepted_at?: string
  created: string
  updated: string
  expand?: {
    invited_by?: {
      id: string
      email: string
      name: string
    }
  }
}

export interface CreateInviteResponse {
  id: string
  email: string
  role: 'admin' | 'user'
  status: 'pending'
  expires_at: string
  created: string
  token: string
}

export interface ValidateInviteResponse {
  valid: boolean
  email: string
  role: 'admin' | 'user'
}

export interface AcceptInvitePayload {
  token: string
  name: string
  password: string
}

export interface AcceptInviteResponse {
  success: boolean
  userId: string
  email: string
  message: string
}

/**
 * Lista todos os convites cadastrados (somente admins).
 */
export async function listInvitations(): Promise<InvitationRecord[]> {
  const records = await pb.collection('invitations').getFullList<InvitationRecord>({
    sort: '-created',
    expand: 'invited_by',
  })
  return records
}

/**
 * Emite um novo convite seguro via endpoint backend.
 */
export async function createInvitation(
  email: string,
  role: 'admin' | 'user' = 'user',
): Promise<CreateInviteResponse> {
  const result = await pb.send<CreateInviteResponse>('/backend/v1/invitations', {
    method: 'POST',
    body: { email, role },
  })
  return result
}

/**
 * Revoga um convite pendente.
 */
export async function revokeInvitation(
  inviteId: string,
): Promise<{ success: boolean; id: string; status: string }> {
  const result = await pb.send<{ success: boolean; id: string; status: string }>(
    '/backend/v1/invitations/revoke',
    {
      method: 'POST',
      body: { id: inviteId },
    },
  )
  return result
}

/**
 * Valida se um token de convite é válido, não expirou e não foi utilizado ou revogado.
 */
export async function validateInvitation(token: string): Promise<ValidateInviteResponse> {
  const result = await pb.send<ValidateInviteResponse>(
    `/backend/v1/invitations/validate?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
    },
  )
  return result
}

/**
 * Conclui o cadastro público a partir de um token de convite válido.
 */
export async function acceptInvitation(
  payload: AcceptInvitePayload,
): Promise<AcceptInviteResponse> {
  const result = await pb.send<AcceptInviteResponse>('/backend/v1/invitations/accept', {
    method: 'POST',
    body: payload,
  })
  return result
}
