'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, Search, X } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PlantCard from '@/components/plant/PlantCard'
import { searchNearby } from '@/lib/actions/plants'
import { OccurrenceWithDistance } from '@/types'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useUser } from '@/hooks/useUser'
import { cn, matchesSearchTerms } from '@/lib/utils'

// Teto de resultados da busca sem raio (ver migration 024). Como o retorno vem ordenado
// por distância, o corte descarta sempre as mais longe — e a lista continua utilizável
// em vez de renderizar a base inteira de uma vez.
const MAX_UNLIMITED_RESULTS = 500

// Ribeirão Preto — centro provisório se o usuário negar a localização ou o GPS falhar.
const FALLBACK_LAT = -21.1767
const FALLBACK_LNG = -47.8208

/**
 * A última busca fica guardada na sessão da aba. Abrir uma planta da lista
 * desmonta esta página, e voltar a montava do zero — a pessoa perdia os
 * resultados e a posição na lista e tinha que buscar de novo. sessionStorage
 * (e não localStorage) porque a busca é "perto de mim, agora": não deve
 * reaparecer dias depois, em outro lugar.
 */
const STORAGE_KEY = 'plantmap:search'

/**
 * Filtros de distância em botões, como os "chips" do Google Maps. Antes era um
 * controle deslizante de 1 a 50 km mais um botão "Mundo todo" — dois
 * controles para uma decisão só, e o deslizante é ruim de acertar com o dedo.
 * `null` é "qualquer distância" (busca sem raio, ver migration 024).
 */
const DISTANCE_CHIPS: { km: number | null; label: string }[] = [
  { km: null, label: 'Qualquer distância' },
  { km: 1, label: 'Até 1 km' },
  { km: 5, label: 'Até 5 km' },
  { km: 25, label: 'Até 25 km' },
]

/** Identifica para qual filtro de distância a lista carregada vale. */
function poolKey(unlimited: boolean, radius: number): string {
  return unlimited ? 'all' : `${radius}km`
}

interface SavedSearch {
  query: string
  radius: number
  unlimited: boolean
  results: OccurrenceWithDistance[]
  searched: boolean
  scrollTop: number
}

function readSavedSearch(): SavedSearch | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedSearch) : null
  } catch {
    return null
  }
}

function writeSavedSearch(s: SavedSearch) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Sem storage (aba privada, cota cheia): a busca só não sobrevive à navegação.
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(5)
  // Padrão sem limite: abre já mostrando as mais próximas, como um app de
  // mapa — antes a tela abria vazia e exigia escolher raio e apertar buscar.
  const [unlimited, setUnlimited] = useState(true)
  // Todas as plantas do filtro de distância atual, mais perto primeiro. O nome
  // digitado filtra isto na hora, sem ir ao servidor a cada letra.
  const [pool, setPool] = useState<OccurrenceWithDistance[]>([])
  const [poolFor, setPoolFor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const { latitude, longitude, acquireBestFix } = useGeolocation()
  const { user } = useUser()

  const listRef = useRef<HTMLDivElement>(null)
  const scrollTopRef = useRef(0)
  // Rolagem a reaplicar depois que a lista restaurada for pintada.
  const pendingScrollRef = useRef<number | null>(null)
  // Só passa a gravar depois de restaurar — senão o estado vazio inicial
  // sobrescreveria a busca salva antes de ela ser lida.
  const [restored, setRestored] = useState(false)

  // Layout effect: restaura antes da primeira pintura, sem piscar a tela vazia.
  useLayoutEffect(() => {
    // Vindo da ficha da erva ("Onde encontrar"), o nome chega na URL e vale
    // mais que a busca guardada.
    const fromUrl = new URLSearchParams(window.location.search).get('q')
    const saved = readSavedSearch()
    if (fromUrl) {
      setQuery(fromUrl)
      setUnlimited(true)
      if (saved?.searched && saved.unlimited) {
        setPool(saved.results)
        setPoolFor(poolKey(true, saved.radius))
      }
    } else if (saved) {
      setQuery(saved.query)
      setRadius(saved.radius)
      setUnlimited(saved.unlimited)
      if (saved.searched) {
        setPool(saved.results)
        setPoolFor(poolKey(saved.unlimited, saved.radius))
      }
      scrollTopRef.current = saved.scrollTop
      pendingScrollRef.current = saved.scrollTop
    }
    setRestored(true)
  }, [])

  const results = useMemo(
    () => query.trim()
      // Mesma regra da busca de espécies (ver matchesSearchTerms e migration 027):
      // ignora acento e pontuação e exige todas as palavras digitadas — quem busca
      // "espada de sao jorge" ou "guine" encontra os registros correspondentes.
      ? pool.filter((o) => matchesSearchTerms(query, o.species?.common_name, o.species?.scientific_name))
      : pool,
    [pool, query]
  )

  useLayoutEffect(() => {
    if (pendingScrollRef.current == null || !listRef.current || results.length === 0) return
    listRef.current.scrollTop = pendingScrollRef.current
    pendingScrollRef.current = null
  }, [results])

  useEffect(() => {
    if (!restored) return
    writeSavedSearch({
      query, radius, unlimited,
      results: pool,
      searched: poolFor === poolKey(unlimited, radius),
      scrollTop: scrollTopRef.current,
    })
  }, [restored, query, radius, unlimited, pool, poolFor])

  // A rolagem muda muito pra regravar tudo a cada evento: guarda no ref e
  // grava junto com o resto ao sair da página (é aí que ela importa).
  useEffect(() => {
    return () => {
      const saved = readSavedSearch()
      if (saved) writeSavedSearch({ ...saved, scrollTop: scrollTopRef.current })
    }
  }, [])

  const load = useCallback(async (isUnlimited: boolean, km: number) => {
    setLoading(true)
    setLoadFailed(false)

    // "Perto de mim" só significa alguma coisa se o ponto de partida estiver
    // certo, então quando ainda não há leitura vale esperar o GPS convergir
    // um pouco — a primeira leitura de rede pode estar quilômetros fora.
    let lat = latitude
    let lng = longitude
    if (lat == null || lng == null) {
      const fix = await acquireBestFix({ timeoutMs: 8_000 })
      lat = fix?.latitude ?? FALLBACK_LAT
      lng = fix?.longitude ?? FALLBACK_LNG
    }

    try {
      const data = isUnlimited
        ? await searchNearby(lat, lng, null, MAX_UNLIMITED_RESULTS)
        : await searchNearby(lat, lng, km * 1000)
      setPool(data)
      setPoolFor(poolKey(isUnlimited, km))
    } catch (err) {
      console.error('Erro na busca:', err)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [latitude, longitude, acquireBestFix])

  // Carrega sozinho ao abrir e a cada troca de distância — sem botão de buscar.
  const currentKey = poolKey(unlimited, radius)
  useEffect(() => {
    if (!restored || poolFor === currentKey || loading || loadFailed) return
    load(unlimited, radius)
  }, [restored, poolFor, currentKey, loading, loadFailed, load, unlimited, radius])

  const chooseDistance = (km: number | null) => {
    setLoadFailed(false)
    if (km == null) {
      setUnlimited(true)
    } else {
      setUnlimited(false)
      setRadius(km)
    }
    if (listRef.current) listRef.current.scrollTop = 0
    scrollTopRef.current = 0
  }

  const showingStale = poolFor !== currentKey
  const trimmed = query.trim()

  return (
    <MobileShell>
      <PageHeader title="Buscar plantas" showBack={false} />

      <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-700 dark:text-green-400" />
          <input
            type="search"
            enterKeyHint="search"
            aria-label="Nome da planta"
            // Quem chega tocando na barra de busca do mapa espera já poder
            // digitar. Só com a busca vazia: voltando de uma planta com a
            // busca preservada, abrir o teclado seria intrusivo.
            autoFocus={query === ''}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            placeholder="Nome da planta (ex.: arruda)"
            className="min-h-12 w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-11 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Rolagem lateral em vez de quebrar linha: os quatro cabem em telas
            largas e continuam alcançáveis nas estreitas. */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Distância">
          {DISTANCE_CHIPS.map((chip) => {
            const active = chip.km == null ? unlimited : !unlimited && radius === chip.km
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => chooseDistance(chip.km)}
                aria-pressed={active}
                className={cn(
                  'min-h-9 flex-shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-green-700 bg-green-700 text-white dark:border-green-600 dark:bg-green-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={(e) => { scrollTopRef.current = e.currentTarget.scrollTop }}
        className="flex-1 overflow-y-auto px-4 pb-4"
      >
        {loading && showingStale && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            ))}
          </div>
        )}

        {loadFailed && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="font-medium text-gray-700 dark:text-gray-200">Não foi possível carregar as plantas</p>
            <button
              type="button"
              onClick={() => load(unlimited, radius)}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar de novo
            </button>
          </div>
        )}

        {!showingStale && !loadFailed && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-700" />
            <p className="font-medium text-gray-700 dark:text-gray-200">
              {trimmed ? `Nenhuma planta com o nome “${trimmed}”` : 'Nenhuma planta nesta distância'}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {unlimited
                ? 'Confira a grafia ou tente outro nome'
                : 'Tente “Qualquer distância” para buscar em todo lugar'}
            </p>
            {/* Não é beco sem saída: quem conhece um pé pode pôr no mapa. */}
            {unlimited && trimmed && user && (
              <Link
                href="/plant/register"
                className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                Sabe onde tem? Cadastre no mapa
              </Link>
            )}
            {!unlimited && (
              <button
                type="button"
                onClick={() => chooseDistance(null)}
                className="mt-4 min-h-11 rounded-xl bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700"
              >
                Buscar em qualquer distância
              </button>
            )}
          </div>
        )}

        {!showingStale && results.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {results.length} planta{results.length !== 1 ? 's' : ''}
                {trimmed ? ` com “${trimmed}”` : ''} · mais perto primeiro
              </p>
              <button
                type="button"
                onClick={() => load(unlimited, radius)}
                disabled={loading}
                aria-label="Atualizar a partir da minha localização"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </button>
            </div>
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
