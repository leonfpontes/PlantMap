import type { Species } from '@/types'

/** Resposta do Pl@ntNet (só o que usamos). */
export interface PlantNetResult {
  score: number
  species: {
    scientificNameWithoutAuthor: string
    genus?: { scientificNameWithoutAuthor: string }
    commonNames?: string[]
  }
}

export interface IdentifySuggestion {
  /** Espécie do catálogo correspondente, quando existe. */
  species: Pick<Species, 'id' | 'common_name' | 'scientific_name' | 'image_url' | 'status'> | null
  scientificName: string
  commonNames: string[]
  /** Confiança do Pl@ntNet, de 0 a 1. */
  score: number
}

const norm = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** "Petiveria alliacea L." -> "petiveria alliacea" (gênero + epíteto). */
export function binomial(name: string | null | undefined): string | null {
  if (!name) return null
  const partes = norm(name).split(' ').filter((p) => p && p !== 'x')
  return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : null
}

/**
 * Cruza os resultados do Pl@ntNet com o catálogo pelo nome científico.
 * Ignora palpites muito fracos e devolve no máximo `limit`, mais confiáveis
 * primeiro — com as que existem no catálogo antes, porque só elas podem ser
 * escolhidas no cadastro.
 */
export function matchSuggestions(
  results: PlantNetResult[],
  catalog: IdentifySuggestion['species'][],
  { minScore = 0.05, limit = 3 }: { minScore?: number; limit?: number } = {}
): IdentifySuggestion[] {
  const porNome = new Map<string, NonNullable<IdentifySuggestion['species']>>()
  for (const sp of catalog) {
    const k = binomial(sp?.scientific_name)
    if (sp && k && !porNome.has(k)) porNome.set(k, sp)
  }

  const vistos = new Set<string>()
  const sugestoes: IdentifySuggestion[] = []
  for (const r of results) {
    if (r.score < minScore) continue
    const k = binomial(r.species.scientificNameWithoutAuthor)
    if (!k || vistos.has(k)) continue
    vistos.add(k)
    sugestoes.push({
      species: porNome.get(k) ?? null,
      scientificName: r.species.scientificNameWithoutAuthor,
      commonNames: (r.species.commonNames ?? []).slice(0, 3),
      score: r.score,
    })
  }

  return sugestoes
    .sort((a, b) => Number(!!b.species) - Number(!!a.species) || b.score - a.score)
    .slice(0, limit)
}
