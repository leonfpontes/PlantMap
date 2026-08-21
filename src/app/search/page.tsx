'use client'

import { useState } from 'react'
import { Globe, Search, SlidersHorizontal } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PlantCard from '@/components/plant/PlantCard'
import { searchNearby } from '@/lib/actions/plants'
import { OccurrenceWithDistance } from '@/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { cn, matchesSearchTerms } from '@/lib/utils'

// Teto de resultados da busca sem raio (ver migration 024). Como o retorno vem ordenado
// por distância, o corte descarta sempre as mais longe — e a lista continua utilizável
// em vez de renderizar a base inteira de uma vez.
const MAX_UNLIMITED_RESULTS = 500

// Ribeirão Preto — centro provisório se o usuário negar a localização ou o GPS falhar.
const FALLBACK_LAT = -21.1767
const FALLBACK_LNG = -47.8208

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(5)
  const [unlimited, setUnlimited] = useState(false)
  const [results, setResults] = useState<OccurrenceWithDistance[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { latitude, longitude, loading: locLoading, acquireBestFix } = useGeolocation()

  const handleSearch = async () => {
    setLoading(true)
    setSearched(true)

    // "Perto de mim" só significa alguma coisa se o ponto de partida estiver
    // certo, então quando ainda não há leitura vale esperar o GPS convergir
    // um pouco — antes daqui saía a primeira leitura que aparecesse, que num
    // fix de rede pode estar quilômetros fora e desloca o raio inteiro.
    let lat = latitude
    let lng = longitude

    if (lat == null || lng == null) {
      const fix = await acquireBestFix({ timeoutMs: 8_000 })
      lat = fix?.latitude ?? FALLBACK_LAT
      lng = fix?.longitude ?? FALLBACK_LNG
    }

    try {
      const data = unlimited
        ? await searchNearby(lat, lng, null, MAX_UNLIMITED_RESULTS)
        : await searchNearby(lat, lng, radius * 1000)
      // Mesma regra da busca de espécies (ver matchesSearchTerms e migration 027):
      // ignora acento e pontuação e exige todas as palavras digitadas — quem busca
      // "espada de sao jorge" ou "guine" encontra os registros correspondentes.
      const filtered = query.trim()
        ? data.filter((o) =>
            matchesSearchTerms(query, o.species?.common_name, o.species?.scientific_name)
          )
        : data
      setResults(filtered)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileShell>
      <PageHeader title="Buscar Plantas" showBack={false} />

      <div className="flex flex-col gap-4 p-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nome da espécie..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <SlidersHorizontal className="h-4 w-4" />
              Raio:{' '}
              <span className="text-green-700 dark:text-green-400">
                {unlimited ? 'sem limite' : `${radius} km`}
              </span>
            </label>

            {/* Busca sem raio: útil pra quem está viajando e quer ver as plantas de casa
                (ou de qualquer outro lugar), que ficariam fora de qualquer raio do slider. */}
            <button
              type="button"
              onClick={() => setUnlimited((v) => !v)}
              aria-pressed={unlimited}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                unlimited
                  ? 'border-green-700 bg-green-700 text-white dark:border-green-600 dark:bg-green-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              Mundo todo
            </button>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={radius}
            disabled={unlimited}
            onChange={(e) => setRadius(Number(e.target.value))}
            className={cn('w-full accent-green-700', unlimited && 'opacity-40')}
          />
          <div className={cn('flex justify-between text-xs text-gray-400 dark:text-gray-500', unlimited && 'opacity-40')}>
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || locLoading}
          className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 transition-colors dark:bg-green-600 dark:hover:bg-green-700"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Buscar próximo a mim
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-gray-300 mb-3 dark:text-gray-700" />
            <p className="font-medium text-gray-600 dark:text-gray-300">Nenhuma planta encontrada</p>
            <p className="text-sm text-gray-400 mt-1 dark:text-gray-500">
              {unlimited
                ? 'Nenhum registro corresponde à busca, em nenhum lugar'
                : 'Tente aumentar o raio ou buscar no mundo todo'}
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-3">
              {results.map((occ) => (
                <PlantCard key={occ.id} occurrence={occ} />
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </MobileShell>
  )
}
