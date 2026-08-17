'use server'

import { createClient } from '@/lib/supabase/server'
import { getBadgeTier } from '@/constants/ranking'
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
 * Busca ocorrências de plantas a partir de uma coordenada geográfica, ordenadas da mais próxima
 * para a mais distante.
 *
 * Como funciona:
 * 1. Executa a função RPC `search_nearby` criada no PostgreSQL/PostGIS. Essa função usa `ST_DWithin`
 *    no banco para encontrar os pontos eficientemente utilizando índices espaciais.
 * 2. Mapeia as espécies correspondentes de forma otimizada. Para evitar a query N+1 (uma chamada no
 *    banco para cada ocorrência para pegar a espécie), agrupamos os IDs únicos de espécies retornados,
 *    buscamos as espécies uma única vez (`.in(...)`) e mesclamos os dados na memória da aplicação.
 *
 * @param radiusM Raio em metros, ou `null` para busca sem limite de raio (mundo todo) —
 *   ver migration 024. Sem raio, quem viaja continua enxergando as ocorrências de casa.
 * @param maxResults Teto de resultados, aplicado depois da ordenação por distância (então corta
 *   sempre as mais distantes). `null` = sem teto; use um valor ao buscar sem raio, para o payload
 *   não crescer junto com a base.
 */
export async function searchNearby(
  lat: number,
  lng: number,
  radiusM: number | null,
  maxResults: number | null = null
): Promise<OccurrenceWithDistance[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_nearby', {
    lat,
    lng,
    radius_m: radiusM,
    max_results: maxResults,
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

  // A tela credita uma pessoa só: quem editou por último, quando o registro já
  // foi editado (migration 026), senão quem registrou. Busca só esse perfil.
  const credited = data.updated_by || data.user_id
  const kind = data.updated_by ? 'updated' : 'registered'

  // Espécie e pessoa creditada não dependem uma da outra: em paralelo pra tela
  // não pagar dois round-trips em série.
  const [{ data: species }, { data: profile }] = await Promise.all([
    supabase.from('species').select('*').eq('id', data.species_id).single(),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, points, deleted_at')
      .eq('id', credited)
      .single(),
  ])

  return {
    ...data,
    species: species || undefined,
    credit: profile
      ? {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          points: profile.points ?? 0,
          tier: getBadgeTier(profile.points ?? 0),
          deleted: !!profile.deleted_at,
          kind,
          at: kind === 'updated' ? data.updated_at : data.created_at,
        }
      : undefined,
  } as PlantOccurrence
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

/**
 * Busca espécies pelo nome popular ou científico para o autocomplete do registro.
 *
 * Vai pela RPC `search_species` (migration 025) em vez de um `.ilike` direto porque
 * a comparação precisa ignorar acentuação — quem digita "guine" ou "acafrao" tem que
 * achar "Guiné" e "Açafrão". A RPC compara as duas pontas já normalizadas e devolve
 * primeiro quem *começa* com o termo, já que o corte em 20 resultados sem ordenação
 * podia esconder justamente a espécie mais óbvia.
 */
export async function searchSpecies(query: string): Promise<Species[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('search_species', {
    p_query: query,
    p_limit: 20,
  })
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
