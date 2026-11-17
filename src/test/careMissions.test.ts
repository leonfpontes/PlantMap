import { describe, it, expect } from 'vitest'
import { daysSince, formatSeenAgo, pickCareMissions } from '@/lib/careMissions'
import type { OccurrenceWithDistance } from '@/types'

const AGORA = new Date('2026-11-17T12:00:00Z')
const diasAtras = (d: number) => new Date(AGORA.getTime() - d * 86_400_000).toISOString()

function occ(id: string, over: Partial<OccurrenceWithDistance>): OccurrenceWithDistance {
  return {
    id, user_id: 'u', species_id: 's', latitude: 0, longitude: 0, condition: 'healthy', stage: 'adult',
    notes: null, photo_url: null, verified: false, created_at: diasAtras(400), updated_at: diasAtras(400),
    distance_m: 100, last_seen_at: diasAtras(1), gone_reports: 0, ...over,
  }
}

describe('pickCareMissions', () => {
  it('prioriza "não encontrada", depois "ruim", depois "sem notícia", e só inclui quem precisa', () => {
    const lista = [
      occ('vista-ontem', {}),
      occ('sem-noticia', { last_seen_at: diasAtras(45), distance_m: 50 }),
      occ('ruim', { condition: 'poor', distance_m: 900 }),
      occ('sumiu', { gone_reports: 1, distance_m: 2000 }),
    ]
    expect(pickCareMissions(lista, AGORA).map((m) => [m.occurrence.id, m.reason])).toEqual([
      ['sumiu', 'gone'],
      ['ruim', 'poor'],
      ['sem-noticia', 'stale'],
    ])
  })

  it('no mesmo motivo, a mais perto vem primeiro', () => {
    const lista = [
      occ('longe', { last_seen_at: diasAtras(60), distance_m: 5000 }),
      occ('perto', { last_seen_at: diasAtras(60), distance_m: 200 }),
    ]
    expect(pickCareMissions(lista, AGORA).map((m) => m.occurrence.id)).toEqual(['perto', 'longe'])
  })
})

describe('formatSeenAgo', () => {
  it('fala como gente', () => {
    expect(formatSeenAgo(daysSince(diasAtras(0), AGORA))).toBe('vista hoje')
    expect(formatSeenAgo(1)).toBe('vista ontem')
    expect(formatSeenAgo(12)).toBe('vista há 12 dias')
    expect(formatSeenAgo(65)).toBe('vista há 2 meses')
    expect(formatSeenAgo(400)).toBe('vista há 1 ano')
    expect(formatSeenAgo(null)).toBeNull()
  })
})
