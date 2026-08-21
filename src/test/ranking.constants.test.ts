import { describe, it, expect } from 'vitest'
import {
  BADGE_TIERS_ORDERED,
  BADGE_TIER_CONFIG,
  getBadgeTier,
  getNextBadgeTier,
} from '@/constants/ranking'

describe('getBadgeTier', () => {
  it.each([
    [0, 'sementeira'],
    [24, 'sementeira'],
    [25, 'broto'],
    [99, 'broto'],
    [100, 'raiz'],
    [249, 'raiz'],
    [250, 'guardiao'],
    [599, 'guardiao'],
    [600, 'ancestral'],
    [1199, 'ancestral'],
    [1200, 'tronco'],
    [2499, 'tronco'],
    [2500, 'copa'],
    [4999, 'copa'],
    [5000, 'mata'],
    [9999, 'mata'],
    [10000, 'encantado'],
    [999999, 'encantado'],
  ] as const)('%i pontos -> %s', (points, expected) => {
    expect(getBadgeTier(points)).toBe(expected)
  })
})

describe('BADGE_TIERS_ORDERED', () => {
  it('cobre todos os tiers configurados, em ordem crescente de limiar', () => {
    expect([...BADGE_TIERS_ORDERED].sort()).toEqual(Object.keys(BADGE_TIER_CONFIG).sort())

    const limiares = BADGE_TIERS_ORDERED.map((t) => BADGE_TIER_CONFIG[t].minPoints)
    expect(limiares).toEqual([...limiares].sort((a, b) => a - b))
    expect(new Set(limiares).size).toBe(limiares.length)
  })
})

describe('getNextBadgeTier', () => {
  it.each([
    [0, 'broto', 25],
    [599, 'ancestral', 1],
    [600, 'tronco', 600],
    [2500, 'mata', 2500],
    [9999, 'encantado', 1],
  ] as const)('com %i pontos, o próximo é %s (faltam %i)', (points, tier, pointsAway) => {
    expect(getNextBadgeTier(points)).toEqual({
      tier,
      minPoints: BADGE_TIER_CONFIG[tier].minPoints,
      pointsAway,
    })
  })

  it('retorna null no topo da escada', () => {
    expect(getNextBadgeTier(10000)).toBeNull()
    expect(getNextBadgeTier(50000)).toBeNull()
  })
})
