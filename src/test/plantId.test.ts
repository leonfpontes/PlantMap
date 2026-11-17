import { describe, it, expect } from 'vitest'
import { binomial, matchSuggestions, type PlantNetResult } from '@/lib/plantId'

const r = (name: string, score: number): PlantNetResult => ({ score, species: { scientificNameWithoutAuthor: name, commonNames: [] } })
const catalogo = [
  { id: '1', common_name: 'Manjericão', scientific_name: 'Ocimum basilicum L.', image_url: null, status: 'approved' as const },
  { id: '2', common_name: 'Guiné', scientific_name: 'Petiveria alliacea', image_url: null, status: 'approved' as const },
]

describe('binomial', () => {
  it('reduz a gênero + epíteto, sem autor nem acento', () => {
    expect(binomial('Ocimum basilicum L.')).toBe('ocimum basilicum')
    expect(binomial('Ocimum')).toBeNull()
  })
})

describe('matchSuggestions', () => {
  it('liga ao catálogo pelo nome científico e põe as do catálogo primeiro', () => {
    const s = matchSuggestions([r('Mentha pulegium', 0.5), r('Ocimum basilicum', 0.3)], catalogo)
    expect(s.map((x) => [x.scientificName, x.species?.common_name ?? null])).toEqual([
      ['Ocimum basilicum', 'Manjericão'],
      ['Mentha pulegium', null],
    ])
  })

  it('descarta palpites fracos', () => {
    expect(matchSuggestions([r('Petiveria alliacea', 0.01)], catalogo)).toEqual([])
  })
})
