import { describe, it, expect } from 'vitest'
import {
  ACCURACY_TOLERANCE_M,
  FIX_STALE_MS,
  GeoFix,
  accuracyCircle,
  bestFix,
  formatAccuracy,
  shouldAcceptFix,
} from '@/lib/geo'

const T0 = 1_700_000_000_000

function fix(overrides: Partial<GeoFix> = {}): GeoFix {
  return { latitude: -21.1767, longitude: -47.8208, accuracy: 10, timestamp: T0, ...overrides }
}

describe('shouldAcceptFix', () => {
  it('aceita a primeira leitura', () => {
    expect(shouldAcceptFix(null, fix())).toBe(true)
  })

  it('aceita leitura mais precisa', () => {
    expect(shouldAcceptFix(fix({ accuracy: 50 }), fix({ accuracy: 8, timestamp: T0 + 1000 }))).toBe(true)
  })

  it('aceita piora pequena, que é oscilação normal de quem está andando', () => {
    const atual = fix({ accuracy: 10 })
    const nova = fix({ accuracy: 10 + ACCURACY_TOLERANCE_M - 1, timestamp: T0 + 1000 })
    expect(shouldAcceptFix(atual, nova)).toBe(true)
  })

  it('recusa fix de rede que jogaria o ponto longe, com fix bom e recente em mãos', () => {
    const atual = fix({ accuracy: 8 })
    const ruim = fix({ accuracy: 1500, latitude: -21.2, timestamp: T0 + 2000 })
    expect(shouldAcceptFix(atual, ruim)).toBe(false)
  })

  it('aceita qualquer leitura depois do fix atual expirar, pra o ponto não congelar', () => {
    const atual = fix({ accuracy: 8 })
    const ruim = fix({ accuracy: 1500, timestamp: T0 + FIX_STALE_MS + 1 })
    expect(shouldAcceptFix(atual, ruim)).toBe(true)
  })

  it('ignora leitura que chega fora de ordem', () => {
    expect(shouldAcceptFix(fix({ timestamp: T0 }), fix({ accuracy: 1, timestamp: T0 - 1 }))).toBe(false)
  })
})

describe('bestFix', () => {
  it('escolhe o de menor raio de erro', () => {
    expect(bestFix(fix({ accuracy: 40 }), fix({ accuracy: 12 }))?.accuracy).toBe(12)
    expect(bestFix(fix({ accuracy: 5 }), fix({ accuracy: 12 }))?.accuracy).toBe(5)
  })

  it('lida com null dos dois lados', () => {
    expect(bestFix(null, null)).toBeNull()
    expect(bestFix(null, fix())?.accuracy).toBe(10)
    expect(bestFix(fix(), null)?.accuracy).toBe(10)
  })
})

describe('formatAccuracy', () => {
  it.each([
    [8.4, '±8 m'],
    [0, '±0 m'],
    [999, '±999 m'],
    [1500, '±1,5 km'],
  ])('%s -> %s', (m, esperado) => {
    expect(formatAccuracy(m)).toBe(esperado)
  })

  it('não quebra com valor inválido', () => {
    expect(formatAccuracy(Number.NaN)).toBe('±? m')
    expect(formatAccuracy(-1)).toBe('±? m')
  })
})

describe('accuracyCircle', () => {
  it('fecha o anel', () => {
    const ring = accuracyCircle(-21.1767, -47.8208, 30).geometry.coordinates[0]
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  it('tem raio proporcional aos metros pedidos', () => {
    const centro = { lat: -21.1767, lng: -47.8208 }
    const pequeno = accuracyCircle(centro.lat, centro.lng, 30).geometry.coordinates[0]
    const grande = accuracyCircle(centro.lat, centro.lng, 300).geometry.coordinates[0]

    // O ponto em theta=90° fica exatamente ao norte do centro, então a diferença
    // de latitude é o raio convertido em graus.
    const dPequeno = Math.abs(pequeno[16][1] - centro.lat)
    const dGrande = Math.abs(grande[16][1] - centro.lat)

    expect(dGrande / dPequeno).toBeCloseTo(10, 5)
    // 30 m em graus de latitude ≈ 0.00027
    expect(dPequeno).toBeCloseTo(0.00027, 4)
  })

  it('corrige a longitude pela latitude, senão o círculo vira elipse na tela', () => {
    const lat = -21.1767
    const ring = accuracyCircle(lat, -47.8208, 100).geometry.coordinates[0]
    const dLng = Math.abs(ring[0][0] - -47.8208)
    const dLat = Math.abs(ring[16][1] - lat)
    expect(dLng / dLat).toBeCloseTo(1 / Math.cos((lat * Math.PI) / 180), 4)
  })
})
