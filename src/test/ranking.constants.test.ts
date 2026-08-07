import { describe, it, expect } from 'vitest'
import { getBadgeTier } from '@/constants/ranking'

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
    [10000, 'ancestral'],
  ] as const)('%i pontos -> %s', (points, expected) => {
    expect(getBadgeTier(points)).toBe(expected)
  })
})
