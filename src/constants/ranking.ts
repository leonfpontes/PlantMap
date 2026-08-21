/**
 * Configuração de tiers de badge de gamificação (ver migrations 023 e 029).
 * Puramente de exibição — quem concede os pontos de fato é a trigger em
 * log_occurrence_change(); os limiares/labels aqui são cópia fácil de ajustar,
 * não lógica de negócio.
 *
 * A escada tem duas metades com propósitos diferentes. Até Ancestral Verde
 * (600) ela é de entrada: os degraus são curtos porque servem pra dar o
 * primeiro retorno rápido a quem acabou de chegar. Do 1200 pra cima ela vira
 * de permanência — os quatro tiers acrescentados na migration 029, dobrando a
 * cada degrau (1200 / 2500 / 5000 / 10000), existem porque o antigo teto de
 * 600 já tinha sido alcançado e, alcançado o teto, o ranking parava de
 * significar qualquer coisa pra quem estava lá em cima.
 *
 * A escolha de dobrar (e não de subir o 600) é deliberada: ninguém é rebaixado
 * pelo rebalanceamento, e quem já era Ancestral continua Ancestral — só passa
 * a ter pra onde ir. Nessa faixa alta o caminho realista deixa de ser cadastrar
 * (+10, uma vez por planta) e passa a ser manter (+5 por ocorrência a cada 30
 * dias, repetível pra sempre), que é exatamente o comportamento que o ranking
 * existe pra premiar.
 */

import type { BadgeTier } from '@/types'

export const BADGE_TIER_CONFIG: Record<
  BadgeTier,
  {
    label: string
    minPoints: number
    variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' | 'teal' | 'emerald' | 'indigo' | 'amber'
  }
> = {
  sementeira: { label: 'Sementeira',        minPoints: 0,     variant: 'gray'    },
  broto:      { label: 'Broto',             minPoints: 25,    variant: 'green'   },
  raiz:       { label: 'Raiz',              minPoints: 100,   variant: 'blue'    },
  guardiao:   { label: 'Guardião do Mato',  minPoints: 250,   variant: 'yellow'  },
  ancestral:  { label: 'Ancestral Verde',   minPoints: 600,   variant: 'purple'  },
  tronco:     { label: 'Tronco Firme',      minPoints: 1200,  variant: 'teal'    },
  copa:       { label: 'Copa Sagrada',      minPoints: 2500,  variant: 'emerald' },
  mata:       { label: 'Mata Viva',         minPoints: 5000,  variant: 'indigo'  },
  encantado:  { label: 'Encantado da Mata', minPoints: 10000, variant: 'amber'   },
}

export const BADGE_TIERS_ORDERED: BadgeTier[] = [
  'sementeira',
  'broto',
  'raiz',
  'guardiao',
  'ancestral',
  'tronco',
  'copa',
  'mata',
  'encantado',
]

/** Maior tier cujo limiar de pontos já foi alcançado. */
export function getBadgeTier(points: number): BadgeTier {
  let tier: BadgeTier = 'sementeira'
  for (const t of BADGE_TIERS_ORDERED) {
    if (points >= BADGE_TIER_CONFIG[t].minPoints) tier = t
  }
  return tier
}

/**
 * Próximo tier e quanto falta pra ele — null quando já está no topo da escada.
 * Existe pra UI poder mostrar o alvo seguinte: sem isso, quem chega no último
 * tier disponível volta a ficar sem nada pra perseguir, que é justamente o
 * problema que a migration 029 veio corrigir.
 */
export function getNextBadgeTier(
  points: number
): { tier: BadgeTier; minPoints: number; pointsAway: number } | null {
  const next = BADGE_TIERS_ORDERED.find((t) => points < BADGE_TIER_CONFIG[t].minPoints)
  if (!next) return null
  const { minPoints } = BADGE_TIER_CONFIG[next]
  return { tier: next, minPoints, pointsAway: minPoints - points }
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
