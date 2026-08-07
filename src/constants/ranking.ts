/**
 * Configuração de tiers de badge de gamificação (ver migration 023). Puramente
 * de exibição — quem concede os pontos de fato é a trigger em
 * log_occurrence_change(); os limiares/labels aqui são cópia fácil de ajustar,
 * não lógica de negócio.
 */

import type { BadgeTier } from '@/types'

export const BADGE_TIER_CONFIG: Record<
  BadgeTier,
  { label: string; minPoints: number; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' }
> = {
  sementeira: { label: 'Sementeira',        minPoints: 0,   variant: 'gray'   },
  broto:      { label: 'Broto',             minPoints: 25,  variant: 'green'  },
  raiz:       { label: 'Raiz',              minPoints: 100, variant: 'blue'   },
  guardiao:   { label: 'Guardião do Mato',  minPoints: 250, variant: 'yellow' },
  ancestral:  { label: 'Ancestral Verde',   minPoints: 600, variant: 'purple' },
}

export const BADGE_TIERS_ORDERED: BadgeTier[] = ['sementeira', 'broto', 'raiz', 'guardiao', 'ancestral']

/** Maior tier cujo limiar de pontos já foi alcançado. */
export function getBadgeTier(points: number): BadgeTier {
  let tier: BadgeTier = 'sementeira'
  for (const t of BADGE_TIERS_ORDERED) {
    if (points >= BADGE_TIER_CONFIG[t].minPoints) tier = t
  }
  return tier
}

/**
 * Mantido em sincronia manualmente com os valores em
 * supabase/migrations/023_ranking_gamification.sql — usado só pra exibir
 * texto explicativo na UI (ex: "+10 ao registrar"), a concessão real de
 * pontos acontece sempre na trigger, nunca aqui.
 */
export const POINTS_CONFIG = {
  REGISTER: 10,
  MAINTAIN: 5,
  MAINTAIN_COOLDOWN_DAYS: 30,
} as const
