import { describe, it, expect, vi } from 'vitest'

// O componente do mapa importa a biblioteca de mapas (WebGL); aqui só
// interessa a conta do zoom, então o resto vira dublê.
vi.mock('react-map-gl/maplibre', () => ({ default: () => null, NavigationControl: () => null, Marker: () => null, Source: () => null, Layer: () => null }))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

import { zoomAroundUser } from '@/components/map/PlantMap'

describe('zoomAroundUser', () => {
  it('com planta bem perto, abre em nível de rua (com foto nos pins)', () => {
    expect(zoomAroundUser(80)).toBe(15)
  })

  it('abre o bastante para a planta mais próxima aparecer', () => {
    expect(zoomAroundUser(534)).toBe(14)
    expect(zoomAroundUser(3000)).toBe(11)
  })

  it('nunca abre além do nível de cidade, nem sem plantas', () => {
    expect(zoomAroundUser(200_000)).toBe(11)
    expect(zoomAroundUser(Infinity)).toBe(15)
  })
})
