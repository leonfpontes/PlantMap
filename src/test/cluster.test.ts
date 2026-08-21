import { describe, it, expect } from 'vitest'
import { boundsOf, clusterByScreenGrid, toWorld } from '@/lib/cluster'

const RP = { latitude: -21.1767, longitude: -47.8208 }

/** Desloca em metros aproximados, para escrever os casos em unidades reais. */
function offset(base: typeof RP, metrosNorte: number, metrosLeste: number) {
  const dLat = metrosNorte / 111_320
  const dLng = metrosLeste / (111_320 * Math.cos((base.latitude * Math.PI) / 180))
  return { latitude: base.latitude + dLat, longitude: base.longitude + dLng }
}

describe('toWorld', () => {
  it('mapeia o meridiano e o equador para o centro', () => {
    const { x, y } = toWorld(0, 0)
    expect(x).toBeCloseTo(0.5, 10)
    expect(y).toBeCloseTo(0.5, 10)
  })

  it('cresce para leste e para o sul', () => {
    expect(toWorld(100, 0).x).toBeGreaterThan(toWorld(-100, 0).x)
    expect(toWorld(0, -40).y).toBeGreaterThan(toWorld(0, 40).y)
  })

  it('limita a latitude ao alcance do Mercator, sem gerar infinito', () => {
    expect(Number.isFinite(toWorld(0, 90).y)).toBe(true)
    expect(Number.isFinite(toWorld(0, -90).y)).toBe(true)
  })
})

describe('clusterByScreenGrid', () => {
  it('não agrupa nada quando não há pontos', () => {
    expect(clusterByScreenGrid([], 12, 54)).toEqual([])
  })

  it('junta pontos próximos num zoom afastado e os separa ao aproximar', () => {
    // ~40 m de distância: encavalados numa vista de cidade, bem separados na de rua.
    const pontos = [RP, offset(RP, 40, 0)]

    const longe = clusterByScreenGrid(pontos, 11, 54)
    const perto = clusterByScreenGrid(pontos, 19, 54)

    expect(longe).toHaveLength(1)
    expect(longe[0].items).toHaveLength(2)
    expect(perto).toHaveLength(2)
  })

  it('posiciona o grupo no centroide dos membros', () => {
    const a = RP
    const b = offset(RP, 100, 100)
    const [grupo] = clusterByScreenGrid([a, b], 10, 54)

    expect(grupo.items).toHaveLength(2)
    expect(grupo.latitude).toBeCloseTo((a.latitude + b.latitude) / 2, 10)
    expect(grupo.longitude).toBeCloseTo((a.longitude + b.longitude) / 2, 10)
  })

  it('deixa o ponto solto exatamente onde ele está', () => {
    const [grupo] = clusterByScreenGrid([RP], 12, 54)
    expect(grupo.items).toHaveLength(1)
    expect(grupo.latitude).toBe(RP.latitude)
    expect(grupo.longitude).toBe(RP.longitude)
  })

  it('preserva todos os pontos, sem perder nem duplicar nenhum', () => {
    const pontos = Array.from({ length: 60 }, (_, i) => offset(RP, i * 25, (i % 7) * 25))
    for (const zoom of [8, 12, 16, 20]) {
      const total = clusterByScreenGrid(pontos, zoom, 54).reduce((s, c) => s + c.items.length, 0)
      expect(total).toBe(pontos.length)
    }
  })

  it('agrupa menos conforme o zoom aumenta', () => {
    const pontos = Array.from({ length: 40 }, (_, i) => offset(RP, i * 30, (i % 5) * 30))
    const contagens = [9, 12, 15, 18].map((z) => clusterByScreenGrid(pontos, z, 54).length)
    for (let i = 1; i < contagens.length; i++) {
      expect(contagens[i]).toBeGreaterThanOrEqual(contagens[i - 1])
    }
  })

  it('dá ids distintos a grupos distintos, pra servirem de key', () => {
    const pontos = Array.from({ length: 30 }, (_, i) => offset(RP, i * 400, 0))
    const clusters = clusterByScreenGrid(pontos, 13, 54)
    expect(new Set(clusters.map((c) => c.id)).size).toBe(clusters.length)
  })
})

describe('boundsOf', () => {
  it('envolve todos os pontos', () => {
    const b = boundsOf([RP, offset(RP, 500, 500), offset(RP, -200, -300)])!
    expect(b.south).toBeLessThan(RP.latitude)
    expect(b.north).toBeGreaterThan(RP.latitude)
    expect(b.west).toBeLessThan(RP.longitude)
    expect(b.east).toBeGreaterThan(RP.longitude)
  })

  it('devolve null sem pontos', () => {
    expect(boundsOf([])).toBeNull()
  })
})
