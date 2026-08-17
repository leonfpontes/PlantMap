'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeSearchText } from '@/lib/utils'
import { Species, SpeciesOrigin } from '@/types'

/**
 * Filtro de busca por nome das listas de catálogo, ignorando acentuação e
 * pontuação (hífen e barra do catálogo não atrapalham: "espada de sao jorge" acha
 * "Espada-de-São-Jorge").
 *
 * O termo digitado é normalizado aqui e comparado com as colunas `*_normalized`
 * mantidas pelo banco (migrations 025 e 027) — as colunas originais continuam
 * intactas para exibição. Como a normalização só deixa passar letra, número e
 * espaço, o termo já chega livre de vírgula e parêntese, que são metacaracteres
 * da sintaxe de filtro do PostgREST e quebrariam a query inteira.
 *
 * Aqui a busca é por frase, não palavra a palavra como no autocomplete
 * (`search_species`): estas telas são de gestão, e a lista completa fica a um
 * scroll de distância.
 */
function nameSearchFilter(query: string): string {
  const term = normalizeSearchText(query)
  return `common_name_normalized.ilike.%${term}%,scientific_name_normalized.ilike.%${term}%`
}

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

/**
 * Catálogo de espécies aprovadas para gestão de foto de referência (ver migration 014).
 * Prioriza espécies sem foto (mostradas primeiro) para facilitar o backfill das ~170
 * espécies existentes que nasceram sem `image_url`. Aceita busca por nome opcional.
 */
export async function listApprovedSpeciesCatalog(query?: string): Promise<Species[]> {
  const supabase = await createClient()
  let request = supabase
    .from('species')
    .select('*')
    .eq('status', 'approved')

  if (query && query.length >= 2) {
    request = request.or(nameSearchFilter(query))
  }

  const { data } = await request
    .order('image_url', { ascending: true, nullsFirst: true })
    .order('common_name', { ascending: true })
    .limit(100)

  return data || []
}

/** Define/troca a foto de referência de uma espécie. Só admins conseguem (checado na RPC). */
export async function updateSpeciesImage(
  speciesId: string,
  imageUrl: string
): Promise<{ species?: Species; error?: string }> {
  const supabase = await createClient()

  const { data: species, error } = await supabase.rpc('set_species_image', {
    p_species_id: speciesId,
    p_image_url: imageUrl,
  })

  if (error) return { error: error.message }
  return { species }
}

export interface SpeciesAdminFormData {
  common_name: string
  scientific_name?: string
  family?: string
  origin?: SpeciesOrigin
  description?: string
  image_url?: string
}

/**
 * Catálogo completo para gestão administrativa (migration 022) — qualquer status,
 * não só aprovadas. A RLS de `species` já deixa um admin ver tudo (migration 013),
 * então esta query não precisa de RPC, só do filtro de busca opcional.
 */
export async function listAllSpeciesAdmin(query?: string): Promise<Species[]> {
  const supabase = await createClient()
  let request = supabase.from('species').select('*')

  if (query && query.length >= 2) {
    request = request.or(nameSearchFilter(query))
  }

  const { data } = await request.order('common_name', { ascending: true }).limit(500)
  return data || []
}

/** Cadastra uma espécie diretamente aprovada (fora do fluxo de sugestão/moderação). Só admin. */
export async function createSpeciesAdmin(
  data: SpeciesAdminFormData
): Promise<{ species?: Species; error?: string }> {
  const supabase = await createClient()

  const { data: species, error } = await supabase.rpc('create_species_admin', {
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

/** Edita os dados de uma espécie existente (qualquer status). Só admin. */
export async function updateSpeciesAdmin(
  speciesId: string,
  data: SpeciesAdminFormData
): Promise<{ species?: Species; error?: string }> {
  const supabase = await createClient()

  const { data: species, error } = await supabase.rpc('update_species_admin', {
    p_species_id: speciesId,
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

/**
 * Exclui uma espécie definitivamente. Só admin, e só se nenhuma ocorrência
 * registrada apontar para ela (checado na RPC, que devolve um erro claro).
 */
export async function deleteSpeciesAdmin(speciesId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('delete_species_admin', { p_species_id: speciesId })

  if (error) return { error: error.message }
  return {}
}
