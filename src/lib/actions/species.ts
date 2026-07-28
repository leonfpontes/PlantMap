'use server'

import { createClient } from '@/lib/supabase/server'
import { Species, SpeciesOrigin } from '@/types'

export interface SpeciesModerationItem extends Species {
  submitter: { full_name: string | null; email: string } | null
}

/**
 * Sugere uma nova espécie para o catálogo. Nasce com status 'pending' e só fica
 * visível para quem sugeriu até um admin aprovar ou rejeitar (ver migration 013).
 * `scientific_name` é opcional: quem cadastra pode conhecer só o nome popular/religioso.
 */
export async function submitSpecies(data: {
  common_name: string
  scientific_name?: string
  family?: string
  origin?: SpeciesOrigin
  description?: string
  image_url?: string
}): Promise<{ species?: Species; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: species, error } = await supabase.rpc('submit_species', {
    p_common_name: data.common_name,
    p_scientific_name: data.scientific_name || null,
    p_family: data.family || null,
    p_origin: data.origin || 'native',
    p_description: data.description || null,
    p_image_url: data.image_url || null,
  })

  if (error) return { error: error.message }
  return { species }
}

/** Espécies sugeridas pelo próprio usuário logado, com o status atual de cada uma. */
export async function listMySpeciesSubmissions(): Promise<Species[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('species')
    .select('*')
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false })

  return data || []
}

/**
 * Fila de moderação: espécies pendentes de revisão, com o nome de quem sugeriu.
 * A RLS de `species` só deixa um admin enxergar pendentes de outros usuários,
 * então esta lista naturalmente fica vazia para quem não é admin.
 */
export async function listPendingSpecies(): Promise<SpeciesModerationItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('species')
    .select('*, submitter:profiles!species_submitted_by_fkey(full_name,email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (data || []) as unknown as SpeciesModerationItem[]
}

/** Aprova ou rejeita uma espécie pendente. Só admins conseguem (checado na RPC). */
export async function reviewSpecies(
  speciesId: string,
  approve: boolean,
  rejectionReason?: string
): Promise<{ species?: Species; error?: string }> {
  const supabase = await createClient()

  const { data: species, error } = await supabase.rpc('review_species', {
    p_species_id: speciesId,
    p_approve: approve,
    p_rejection_reason: rejectionReason || null,
  })

  if (error) return { error: error.message }
  return { species }
}
