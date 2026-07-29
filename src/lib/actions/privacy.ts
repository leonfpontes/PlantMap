'use server'

import { createClient } from '@/lib/supabase/server'

export interface PrivacyPrefs {
  shareExactLocation: boolean
  privacyAcceptedAt: string | null
}

/** Preferências de privacidade do usuário logado (null se não autenticado). */
export async function getPrivacyPrefs(): Promise<PrivacyPrefs | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('share_exact_location, privacy_accepted_at')
    .eq('id', user.id)
    .single()

  if (!data) return null
  return { shareExactLocation: data.share_exact_location, privacyAcceptedAt: data.privacy_accepted_at }
}

/**
 * Aceite da política de privacidade + escolha inicial de localização, feitos
 * juntos no modal de primeiro acesso (ver migration 019: accept_privacy_policy).
 */
export async function acceptPrivacyPolicy(shareExactLocation: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_privacy_policy', { p_share_exact_location: shareExactLocation })
  if (error) return { error: error.message }
  return {}
}

/** Troca a escolha de compartilhar localização exata, a qualquer momento (não mexe no aceite da política). */
export async function updateLocationSharing(shareExactLocation: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('profiles')
    .update({ share_exact_location: shareExactLocation })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}

/**
 * Exportação de dados (portabilidade, LGPD). Não inclui ocorrências já
 * excluídas (soft-delete) — essas já saíram da visão do próprio usuário também.
 */
export async function exportMyData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profile, occurrences, favorites, speciesSubmissions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('occurrences').select('*').eq('user_id', user.id),
    supabase.from('favorites').select('*').eq('user_id', user.id),
    supabase.from('species').select('*').eq('submitted_by', user.id),
  ])

  return {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    occurrences: occurrences.data || [],
    favorites: favorites.data || [],
    species_submissions: speciesSubmissions.data || [],
  }
}

/**
 * Exclusão de conta: anonimiza o perfil, remove/oculta os dados gerados e
 * marca a conta como excluída (ver migration 019: delete_my_account). Bloqueia
 * um novo login com essa conta — ver src/app/auth/callback/route.ts.
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { error: error.message }
  return {}
}
