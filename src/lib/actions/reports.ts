'use server'

import { createClient } from '@/lib/supabase/server'
import type { OccurrenceWithDistance, PlantCondition, ReportResult, ReportStatus, Species } from '@/types'
import { pickCareMissions, type CareMission } from '@/lib/careMissions'

/**
 * "Visitei": a pessoa diz se a planta ainda está lá e como está. Toda a regra
 * (pontos com carência de 7 dias, contagem de "sumiu", fila do admin) vive na
 * RPC `report_occurrence` (migration 032), não aqui.
 */
export async function reportOccurrence(
  occurrenceId: string,
  status: ReportStatus,
  condition?: PlantCondition
): Promise<{ result?: ReportResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Entre na sua conta para relatar uma visita.' }

  const { data, error } = await supabase.rpc('report_occurrence', {
    _occurrence_id: occurrenceId,
    _status: status,
    _condition: status === 'present' ? condition ?? null : null,
  })
  if (error) return { error: error.message }
  return { result: data as ReportResult }
}

/** Plantas na fila de arquivamento (3+ pessoas não encontraram), mais antigas primeiro. */
export interface GoneFlaggedItem {
  id: string
  species: Pick<Species, 'common_name' | 'scientific_name' | 'image_url'> | null
  gone_reports: number
  gone_flagged_at: string
  last_seen_at: string | null
  reports: { created_at: string; status: ReportStatus; reporter: string | null }[]
}

export async function listGoneFlagged(): Promise<GoneFlaggedItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('occurrences')
    .select(`
      id, gone_reports, gone_flagged_at, last_seen_at,
      species:species_id ( common_name, scientific_name, image_url ),
      occurrence_reports ( created_at, status, profiles:user_id ( full_name ) )
    `)
    .not('gone_flagged_at', 'is', null)
    .is('deleted_at', null)
    .order('gone_flagged_at', { ascending: true })
  if (error || !data) return []

  type Row = {
    id: string
    gone_reports: number
    gone_flagged_at: string
    last_seen_at: string | null
    species: GoneFlaggedItem['species'] | GoneFlaggedItem['species'][]
    occurrence_reports: { created_at: string; status: ReportStatus; profiles: { full_name: string | null } | { full_name: string | null }[] | null }[]
  }
  return (data as unknown as Row[]).map((row) => ({
    id: row.id,
    gone_reports: row.gone_reports,
    gone_flagged_at: row.gone_flagged_at,
    last_seen_at: row.last_seen_at,
    species: Array.isArray(row.species) ? row.species[0] ?? null : row.species,
    reports: (row.occurrence_reports ?? [])
      .map((r) => {
        const perfil = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return { created_at: r.created_at, status: r.status, reporter: perfil?.full_name ?? null }
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6),
  }))
}

export async function getGoneFlaggedCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('occurrences')
    .select('id', { count: 'exact', head: true })
    .not('gone_flagged_at', 'is', null)
    .is('deleted_at', null)
  return count ?? 0
}

/** Decisão do admin: arquivar (sai do mapa, ninguém perde ponto) ou manter. */
export async function resolveGoneFlag(occurrenceId: string, action: 'archive' | 'keep') {
  const supabase = await createClient()
  const { error } = await supabase.rpc('resolve_gone_flag', {
    _occurrence_id: occurrenceId,
    _action: action,
  })
  if (error) return { error: error.message }
  return { success: true }
}

/** Raio das missões: perto o bastante para dar pra ir hoje. */
const MISSION_RADIUS_M = 10_000

export async function getCareMissions(lat: number, lng: number): Promise<CareMission[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_nearby', {
    lat,
    lng,
    radius_m: MISSION_RADIUS_M,
    max_results: 300,
  })
  if (error || !data) return []

  const lista = data as OccurrenceWithDistance[]
  const missoes = pickCareMissions(lista)
  if (missoes.length === 0) return []

  const ids = [...new Set(missoes.map((m) => m.occurrence.species_id))]
  const { data: species } = await supabase.from('species').select('*').in('id', ids)
  const porId = new Map((species ?? []).map((s: Species) => [s.id, s]))
  return missoes.map((m) => ({ ...m, occurrence: { ...m.occurrence, species: porId.get(m.occurrence.species_id) } }))
}
