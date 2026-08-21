'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SupportMessage } from '@/types'

/** Envia uma mensagem para a administração via RPC (nasce sempre 'open', notifica todos os admins). */
export async function submitSupportMessage(subject: string, message: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_support_message', {
    p_subject: subject,
    p_message: message,
  })

  if (error) return { error: error.message }
  return {}
}

/** Mensagens de suporte enviadas pelo usuário logado, mais recentes primeiro. */
export async function listMySupportMessages(): Promise<SupportMessage[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('support_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

/** Todas as mensagens de suporte (admin), abertas primeiro. */
export async function listSupportMessages(): Promise<SupportMessage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_messages')
    .select('*')
    .order('status', { ascending: true })
    .order('created_at', { ascending: true })

  return data || []
}

export async function getOpenSupportMessageCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('support_messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')

  return count || 0
}

/** Resolve uma mensagem via RPC (admin only, checado no banco). */
export async function resolveSupportMessage(id: string, adminReply?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('resolve_support_message', {
    p_message_id: id,
    p_admin_reply: adminReply || null,
  })

  if (error) return { error: error.message }

  // Mesmo motivo do reviewSpecies: os contadores de pendência (badges do menu
  // admin, fila de triagem de /admin, atalho no perfil) são renderizados no
  // servidor, e sem invalidar continuariam servindo o payload da carga
  // anterior — anunciando pendência já resolvida até um reload manual.
  revalidatePath('/admin', 'layout')
  revalidatePath('/profile')

  return {}
}
