'use server'

import { createClient } from '@/lib/supabase/server'
import { UserProfile } from '@/types'

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!data) return null

  const oauthAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
  if (oauthAvatar && !data.avatar_url) {
    await supabase.from('profiles').update({ avatar_url: oauthAvatar }).eq('id', user.id)
    return { ...data, avatar_url: oauthAvatar }
  }
  return data
}

export async function updateProfile(updates: { full_name?: string; avatar_url?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function getUserStats(userId: string) {
  const supabase = await createClient()

  const [occurrencesResult, favoritesResult] = await Promise.all([
    supabase.from('occurrences').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const { data: speciesData } = await supabase
    .from('occurrences')
    .select('species_id')
    .eq('user_id', userId)

  const uniqueSpecies = new Set((speciesData || []).map((o) => o.species_id)).size

  return {
    occurrences: occurrencesResult.count || 0,
    favorites: favoritesResult.count || 0,
    species: uniqueSpecies,
  }
}

export async function getFavorites(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('favorites')
    .select(`
      occurrence_id,
      created_at,
      occurrences:occurrence_id (
        id, species_id, condition, stage, verified, notes, photo_url, created_at, updated_at, user_id,
        species (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}
