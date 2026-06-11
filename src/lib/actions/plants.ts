'use server'

import { createClient } from '@/lib/supabase/server'
import { PlantCondition, PlantStage, OccurrenceWithDistance, Species } from '@/types'

export async function registerOccurrence(data: {
  species_id: string
  latitude: number
  longitude: number
  condition: PlantCondition
  stage: PlantStage
  notes?: string
  photo_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('occurrences').insert({
    user_id: user.id,
    species_id: data.species_id,
    location: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
    condition: data.condition,
    stage: data.stage,
    notes: data.notes || null,
    photo_url: data.photo_url || null,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function searchNearby(lat: number, lng: number, radiusM: number): Promise<OccurrenceWithDistance[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_nearby', {
    lat,
    lng,
    radius_m: radiusM,
  })
  if (error) throw error

  if (!data || data.length === 0) return []

  const speciesIds = [...new Set((data as OccurrenceWithDistance[]).map((o) => o.species_id))]
  const { data: speciesData } = await supabase
    .from('species')
    .select('*')
    .in('id', speciesIds)

  const speciesMap = new Map((speciesData || []).map((s: Species) => [s.id, s]))

  return (data as OccurrenceWithDistance[]).map((o) => ({
    ...o,
    species: speciesMap.get(o.species_id),
  }))
}

export async function getOccurrence(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('occurrences')
    .select(`
      *,
      species (*)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getAllOccurrences() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('occurrences')
    .select(`
      id, species_id, condition, stage, verified, created_at,
      species (scientific_name, common_name, origin)
    `)
    .limit(500)

  if (error) return []

  // We need lat/lng - use the search_nearby with large radius as workaround,
  // or select with st_x/st_y via raw query. Use a view approach.
  return data || []
}

export async function toggleFavorite(occurrenceId: string): Promise<{ favorited: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: existing } = await supabase
    .from('favorites')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('occurrence_id', occurrenceId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('occurrence_id', occurrenceId)
    return { favorited: false }
  } else {
    await supabase.from('favorites').insert({ user_id: user.id, occurrence_id: occurrenceId })
    return { favorited: true }
  }
}

export async function searchSpecies(query: string): Promise<Species[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('species')
    .select('*')
    .or(`common_name.ilike.%${query}%,scientific_name.ilike.%${query}%`)
    .limit(20)
  return data || []
}

export async function updateOccurrence(id: string, data: {
  species_id: string
  latitude: number
  longitude: number
  condition: PlantCondition
  stage: PlantStage
  notes?: string
  photo_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('occurrences')
    .update({
      species_id: data.species_id,
      location: `SRID=4326;POINT(${data.longitude} ${data.latitude})`,
      condition: data.condition,
      stage: data.stage,
      notes: data.notes || null,
      photo_url: data.photo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteOccurrence(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('occurrences')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
