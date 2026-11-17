import type { OccurrenceWithDistance } from '@/types'

/**
 * Missões de cuidado: quais plantas perto da pessoa mais precisam de uma
 * visita. Função pura (sem banco) para dar pra testar a regra inteira.
 */

/** A partir daqui a planta conta como "sem notícia". */
export const STALE_DAYS = 30

/** Quantas missões a tela mostra de uma vez. */
export const MAX_MISSIONS = 15

export type MissionReason = 'gone' | 'poor' | 'stale'

export interface CareMission {
  occurrence: OccurrenceWithDistance
  reason: MissionReason
  /** Dias desde a última confirmação (null se nunca houve data). */
  daysSinceSeen: number | null
}

export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000))
}

/**
 * Prioridade: alguém não encontrou (pode ter sumido) > estava ruim na última
 * visita > está sem notícia há muito tempo. Dentro do mesmo motivo, as mais
 * perto primeiro — missão boa é a que dá pra cumprir hoje.
 */
export function pickCareMissions(
  occurrences: OccurrenceWithDistance[],
  now: Date = new Date()
): CareMission[] {
  const ordem: Record<MissionReason, number> = { gone: 0, poor: 1, stale: 2 }
  const missoes: CareMission[] = []

  for (const occurrence of occurrences) {
    const dias = daysSince(occurrence.last_seen_at ?? occurrence.updated_at ?? occurrence.created_at, now)
    let reason: MissionReason | null = null
    if ((occurrence.gone_reports ?? 0) > 0) reason = 'gone'
    else if (occurrence.condition === 'poor') reason = 'poor'
    else if (dias != null && dias >= STALE_DAYS) reason = 'stale'
    if (reason) missoes.push({ occurrence, reason, daysSinceSeen: dias })
  }

  return missoes
    .sort((a, b) => ordem[a.reason] - ordem[b.reason] || a.occurrence.distance_m - b.occurrence.distance_m)
    .slice(0, MAX_MISSIONS)
}

/** "visto hoje", "visto há 3 dias", "visto há 2 meses". */
export function formatSeenAgo(days: number | null): string | null {
  if (days == null) return null
  if (days === 0) return 'vista hoje'
  if (days === 1) return 'vista ontem'
  if (days < 30) return `vista há ${days} dias`
  const meses = Math.floor(days / 30)
  if (meses < 12) return `vista há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(days / 365)
  return `vista há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}
