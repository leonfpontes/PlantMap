import { describe, it, expect, vi } from 'vitest'
import {
  MAP_PALETTE_DARK,
  MAP_PALETTE_LIGHT,
  StyleLayerLike,
  applyMapTheme,
  paintFor,
} from '@/lib/mapTheme'

const P = MAP_PALETTE_LIGHT

function layer(over: Partial<StyleLayerLike> & { id: string }): StyleLayerLike {
  return { type: 'fill', ...over }
}

describe('paintFor', () => {
  it('pinta o fundo', () => {
    expect(paintFor(layer({ id: 'background', type: 'background' }), P)).toEqual({
      'background-color': P.background,
    })
  })

  it('trata qualquer símbolo como rótulo, venha de onde vier', () => {
    for (const fonte of ['place', 'poi', 'transportation_name', 'water_name']) {
      expect(paintFor(layer({ id: `x-${fonte}`, type: 'symbol', 'source-layer': fonte }), P)).toEqual({
        'text-color': P.label,
        'text-halo-color': P.labelHalo,
      })
    }
  })

  it('usa fill ou line na água conforme o tipo da camada', () => {
    expect(paintFor(layer({ id: 'water', 'source-layer': 'water' }), P)).toEqual({ 'fill-color': P.water })
    expect(paintFor(layer({ id: 'waterway', type: 'line', 'source-layer': 'waterway' }), P)).toEqual({
      'line-color': P.water,
    })
  })

  it('dá o verde do app a parque e cobertura vegetal', () => {
    expect(paintFor(layer({ id: 'park', 'source-layer': 'park' }), P)['fill-color']).toBe(P.greenery)
    expect(paintFor(layer({ id: 'landcover-wood', 'source-layer': 'landcover' }), P)['fill-color']).toBe(P.greenery)
    // Uso do solo não é vegetação e não pode entrar no mesmo verde.
    expect(paintFor(layer({ id: 'landuse-residential', 'source-layer': 'landuse' }), P)['fill-color']).toBe(P.landuse)
  })

  it('separa via principal, via comum e contorno', () => {
    const via = (id: string) => paintFor(layer({ id, type: 'line', 'source-layer': 'transportation' }), P)['line-color']
    expect(via('highway-motorway')).toBe(P.roadMajor)
    expect(via('highway-primary')).toBe(P.roadMajor)
    expect(via('highway-minor')).toBe(P.roadMinor)
    // O contorno vence a checagem de via principal: sem isso o casing de uma
    // motorway seria pintado como pista e a via perderia o desenho.
    expect(via('highway-motorway-casing')).toBe(P.roadCasing)
  })

  it('deixa quieta a camada que não reconhece', () => {
    expect(paintFor(layer({ id: 'coisa-nova', 'source-layer': 'algo-que-nao-existia' }), P)).toEqual({})
    expect(paintFor(layer({ id: 'sem-fonte' }), P)).toEqual({})
  })
})

describe('applyMapTheme', () => {
  it('aplica em todas as camadas reconhecidas', () => {
    const setPaintProperty = vi.fn()
    applyMapTheme(
      {
        getStyle: () => ({
          layers: [
            { id: 'background', type: 'background' },
            { id: 'park', type: 'fill', 'source-layer': 'park' },
            { id: 'nada', type: 'fill', 'source-layer': 'desconhecido' },
          ],
        }),
        setPaintProperty,
      },
      P
    )

    expect(setPaintProperty).toHaveBeenCalledWith('background', 'background-color', P.background)
    expect(setPaintProperty).toHaveBeenCalledWith('park', 'fill-color', P.greenery)
    expect(setPaintProperty).toHaveBeenCalledTimes(2)
  })

  it('uma camada que rejeita a propriedade não derruba as outras', () => {
    const setPaintProperty = vi.fn((id: string) => {
      if (id === 'park') throw new Error('propriedade inválida')
    })

    expect(() =>
      applyMapTheme(
        {
          getStyle: () => ({
            layers: [
              { id: 'park', type: 'fill', 'source-layer': 'park' },
              { id: 'background', type: 'background' },
            ],
          }),
          setPaintProperty,
        },
        P
      )
    ).not.toThrow()

    expect(setPaintProperty).toHaveBeenCalledWith('background', 'background-color', P.background)
  })

  it('não quebra com estilo ainda sem camadas', () => {
    const setPaintProperty = vi.fn()
    expect(() => applyMapTheme({ getStyle: () => undefined, setPaintProperty }, P)).not.toThrow()
    expect(setPaintProperty).not.toHaveBeenCalled()
  })
})

describe('paletas', () => {
  it('cobrem as mesmas chaves, pra nenhuma cor faltar num dos temas', () => {
    expect(Object.keys(MAP_PALETTE_DARK).sort()).toEqual(Object.keys(MAP_PALETTE_LIGHT).sort())
  })

  it('são todas cores hex válidas', () => {
    for (const p of [MAP_PALETTE_LIGHT, MAP_PALETTE_DARK]) {
      for (const [chave, cor] of Object.entries(p)) {
        expect(cor, chave).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})
