'use server'

import { createClient } from '@/lib/supabase/server'
import { PlantCondition, PlantStage, OccurrenceWithDistance, PlantOccurrence, Species } from '@/types'


/**
 * Registra uma nova ocorrência de planta no banco de dados.
 * 
 * ATENÇÃO AO GEOM: A coluna `location` do tipo `geometry(Point, 4326)` do PostGIS exige a representação
 * textual WKT (Well-Known Text). A ordem padrão do PostGIS é `POINT(longitude latitude)` (separados por espaço).
 * Passar a ordem inversa resultará em localizações incorretas no mapa (ex: jogando o marcador no oceano ou outro hemisfério).
 */
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('can_register_occurrences')
    .eq('id', user.id)
    .single()

  if (!profile?.can_register_occurrences) {
    return { error: 'Você ainda não tem permissão para registrar ocorrências. Peça acesso em Perfil.' }
  }

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

/**
 * Busca ocorrências de plantas próximas a uma coordenada geográfica dentro de um raio específico.
 * 
 * Como funciona:
 * 1. Executa a função RPC `search_nearby` criada no PostgreSQL/PostGIS. Essa função usa `ST_DWithin`
 *    no banco para encontrar os pontos eficientemente utilizando índices espaciais.
 * 2. Mapeia as espécies correspondentes de forma otimizada. Para evitar a query N+1 (uma chamada no
 *    banco para cada ocorrência para pegar a espécie), agrupamos os IDs únicos de espécies retornados,
 *    buscamos as espécies uma única vez (`.in(...)`) e mesclamos os dados na memória da aplicação.
 */
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

/**
 * Busca uma ocorrência para a tela de detalhe via RPC (em vez de select direto)
 * porque a coordenada precisa respeitar a preferência de privacidade do dono —
 * ver `get_occurrence_detail` na migration 019: aproxima lat/lng (~500m) para
 * quem não é o dono nem admin, quando o dono não optou por compartilhar a
 * localização exata.
 */
export async function getOccurrence(id: string): Promise<PlantOccurrence | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('get_occurrence_detail', { p_occurrence_id: id })
    .single() as { data: Omit<PlantOccurrence, 'species'> | null; error: unknown }

  if (error || !data) return null

  const { data: species } = await supabase
    .from('species')
    .select('*')
    .eq('id', data.species_id)
    .single()

  return { ...data, species: species || undefined } as PlantOccurrence
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

/**
 * Atualiza os dados de uma ocorrência existente.
 * Segue as mesmas diretrizes de formato espacial de ponto `POINT(longitude latitude)` do PostGIS.
 */
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

  if (error) return { error: error.message }
  return { success: true }
}

/**
 * Exclui uma ocorrência lógica (Soft Delete).
 * 
 * IMPORTANTE: Em conformidade com auditoria e boas práticas de integridade de dados do projeto,
 * esta função executa a RPC `soft_delete_occurrence`. Em vez de fazer um DELETE físico na tabela
 * que excluiria os dados para sempre, o banco atualiza uma flag interna (`deleted_at`) ocultando o registro,
 * mas preservando o histórico e os logs de auditoria correspondentes.
 */
export async function deleteOccurrence(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.rpc('soft_delete_occurrence', { occurrence_id: id })

  if (error) return { error: error.message }
  return { success: true }
}
