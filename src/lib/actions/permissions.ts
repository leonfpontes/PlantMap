'use server'

import { createClient } from '@/lib/supabase/server'
import { AdminUserRow, PermissionRequest } from '@/types'

/** Envia um pedido de permissão para registrar ocorrências, via RPC. */
export async function requestOccurrencePermission(message?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('request_occurrence_permission', {
    p_message: message || null,
  })

  if (error) return { error: error.message }
  return {}
}

/** Pedidos de permissão do usuário logado, mais recentes primeiro. */
export async function listMyPermissionRequests(): Promise<PermissionRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('occurrence_permission_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

export async function getOpenPermissionRequestCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('occurrence_permission_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return count || 0
}

/** Resolve um pedido via RPC (admin only, checado no banco). */
export async function reviewPermissionRequest(id: string, approve: boolean, rejectionReason?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('review_occurrence_permission_request', {
    p_request_id: id,
    p_approve: approve,
    p_rejection_reason: rejectionReason || null,
  })

  if (error) return { error: error.message }
  return {}
}

/** Concede ou revoga a permissão diretamente, sem pedido (admin only). */
export async function setRegistrationPermission(userId: string, allowed: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_registration_permission', {
    p_user_id: userId,
    p_allowed: allowed,
  })

  if (error) return { error: error.message }
  return {}
}

/**
 * Todos os usuários já cadastrados, com o pedido de permissão mais recente de
 * cada um (se houver) — base da tela /admin/users. RLS já garante que só
 * admin enxerga todas as linhas de occurrence_permission_requests.
 */
export async function listAllUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient()

  const [{ data: profiles }, { data: requests }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('occurrence_permission_requests').select('*').order('created_at', { ascending: false }),
  ])

  const latestRequestByUser = new Map<string, PermissionRequest>()
  for (const req of requests || []) {
    if (!latestRequestByUser.has(req.user_id)) latestRequestByUser.set(req.user_id, req)
  }

  return (profiles || []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    is_admin: p.is_admin,
    can_register_occurrences: p.can_register_occurrences,
    created_at: p.created_at,
    latest_request: latestRequestByUser.get(p.id) || null,
  }))
}
