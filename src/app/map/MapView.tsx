'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Leaf, List, LocateOff, Search } from 'lucide-react'
import { searchNearby } from '@/lib/actions/plants'
import { OccurrenceWithDistance } from '@/types'
import PlantCard from '@/components/plant/PlantCard'
import MapLegend from '@/components/map/MapLegend'
import BottomSheet from '@/components/ui/BottomSheet'
import { useGeolocation } from '@/hooks/useGeolocation'
import { distanceMeters } from '@/lib/geo'
import { cn, DEFAULT_MAP_ZOOM, zoomForDistance } from '@/lib/utils'

const PlantMap = dynamic(() => import('@/components/map/PlantMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-green-50 animate-pulse dark:bg-green-950/40" />,
})

// Coordenadas de Ribeirão Preto — usadas só como centro provisório enquanto a
// geolocalização real do usuário ainda não resolveu (ou se ele negar/não tiver).
const FALLBACK_LAT = -21.1767
const FALLBACK_LNG = -47.8208

// O mapa busca sem limite de raio (ver migration 024), então o teto de resultados é o
// que segura o tamanho do payload conforme a base cresce. Como a busca vem ordenada por
// distância, o corte tira sempre as mais longe — as daqui do lado nunca somem.
const MAX_MAP_OCCURRENCES = 1000

/**
 * Quanto o usuário precisa se deslocar para a busca ser refeita.
 *
 * A leitura do GPS é contínua e se corrige a cada instante; ligar a busca
 * direto nela refazia a consulta a cada micro-correção. Como a busca não tem
 * raio e já vem ordenada por distância, mover a origem alguns metros não muda
 * o resultado — só a ordem de empate — então esperar meio quilômetro não custa
 * nada e evita o retrabalho.
 */
const SEARCH_ORIGIN_THRESHOLD_M = 500

/**
 * Quantas plantas a lista do celular mostra. A busca já vem ordenada por
 * distância, então são sempre as mais próximas; mais que isso numa lista só
 * pesaria em celular fraco sem ajudar ninguém.
 */
const MOBILE_LIST_LIMIT = 60

export default function MapView() {
  const [occurrences, setOccurrences] = useState<OccurrenceWithDistance[]>([])
  // Só o primeiro carregamento. Rebuscas posteriores são silenciosas: este
  // estado troca o mapa inteiro por um esqueleto, e o mapa é quem mantém o
  // rastreamento de GPS ligado — desmontá-lo a cada rebusca derrubava o
  // rastreamento, que ao remontar entregava posição nova, que disparava outra
  // rebusca. A tela piscava sem parar, sem nunca terminar de carregar.
  const [loading, setLoading] = useState(true)
  // Falha de rede no 3G não pode se passar por "mapa vazio".
  const [loadFailed, setLoadFailed] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const { latitude, longitude, error: geoError } = useGeolocation()

  // Origem da busca: acompanha o GPS, mas só quando ele se afasta o bastante
  // pra mudar o resultado (ver SEARCH_ORIGIN_THRESHOLD_M).
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (latitude == null || longitude == null) return
    setOrigin((prev) => {
      // Devolver o mesmo objeto mantém a identidade e não re-renderiza nada.
      if (prev && distanceMeters({ latitude: prev.lat, longitude: prev.lng }, { latitude, longitude }) < SEARCH_ORIGIN_THRESHOLD_M) {
        return prev
      }
      return { lat: latitude, lng: longitude }
    })
  }, [latitude, longitude])

  const centerLat = origin?.lat ?? FALLBACK_LAT
  const centerLng = origin?.lng ?? FALLBACK_LNG

  useEffect(() => {
    // Refaz a busca quando a localização real do usuário resolver, para que
    // "distância" na lista seja a partir de onde ele está de fato — antes
    // era sempre calculada a partir do centro fixo de Ribeirão Preto, mesmo
    // com o usuário a quilômetros dali.
    let cancelado = false

    // Sem limite de raio: antes eram 100km fixos, e quem viajava para outra cidade abria
    // o app e via o mapa vazio — as plantas de casa ficavam fora do raio. Agora vem tudo,
    // do mais perto para o mais longe, limitado só pelo teto de resultados.
    searchNearby(centerLat, centerLng, null, MAX_MAP_OCCURRENCES)
      .then((data) => {
        if (cancelado) return
        setOccurrences(data)
        setLoadFailed(false)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelado) return
        console.error('Erro ao buscar ocorrências para o mapa:', err)
        setLoadFailed(true)
        setLoading(false)
      })

    return () => { cancelado = true }
  }, [centerLat, centerLng])

  // A busca já vem ordenada por distância, então a primeira ocorrência é a mais próxima.
  // O mapa abre enquadrando ela: com a busca sem raio, as plantas podem estar a centenas
  // de quilômetros, e no zoom padrão a tela ficaria vazia mesmo com tudo carregado.
  const initialZoom = occurrences.length > 0
    ? zoomForDistance(occurrences[0].distance_m)
    : DEFAULT_MAP_ZOOM

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Lista lateral: só em telas largas — no celular o mapa já ocupa a tela toda,
          e um "pin picker" com lista ao lado não faz sentido na largura de um telefone. */}
      <div className="hidden w-[360px] flex-shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white lg:flex dark:border-gray-800 dark:bg-gray-950">
        <div className="flex-shrink-0 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {loading ? 'Carregando...' : `${occurrences.length} planta${occurrences.length !== 1 ? 's' : ''} no mapa`}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            ))}
          </div>
        ) : occurrences.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <Leaf className="h-8 w-8 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum registro ainda</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {occurrences.map((occ) => (
              <div
                key={occ.id}
                onMouseEnter={() => setHoveredId(occ.id)}
                onMouseLeave={() => setHoveredId((id) => (id === occ.id ? null : id))}
                className={cn(
                  'rounded-2xl transition-shadow',
                  hoveredId === occ.id && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-950'
                )}
              >
                <PlantCard occurrence={occ} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coluna do mapa */}
      <div className="relative flex-1">
        {/* right-14 deixa livre o controle de zoom no canto direito. */}
        <div className="absolute top-3 left-4 right-14 z-10 flex flex-col items-start gap-2">
          <Link
            href="/search"
            className="flex min-h-12 w-full items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-600 shadow-md transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            <Search className="h-5 w-5 text-green-700 dark:text-green-400" />
            <span>Buscar planta pelo nome</span>
          </Link>

          {/* Sem isso, quem negou a localização via o mapa num lugar qualquer
              e as distâncias contadas de lá, sem saber por quê. */}
          {geoError && latitude == null && (
            <p className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <LocateOff className="h-3.5 w-3.5 flex-shrink-0" />
              Localização desligada
            </p>
          )}
        </div>

        {!loading && <MapLegend />}

        {/* Lista no celular, como em todo app de mapa: no desktop ela já fica
            ao lado; no telefone não havia jeito de ver as plantas próximas
            em lista sem sair do mapa. */}
        {!loading && occurrences.length > 0 && (
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="absolute bottom-4 left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900 px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-gray-800 lg:hidden dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            <List className="h-4 w-4" />
            Lista
          </button>
        )}

        <BottomSheet
          title={latitude != null ? 'Mais perto de você' : 'Plantas no mapa'}
          open={listOpen}
          onClose={() => setListOpen(false)}
        >
          <div className="-mx-1 flex max-h-[65dvh] flex-col gap-2 overflow-y-auto px-1 pb-1">
            {occurrences.slice(0, MOBILE_LIST_LIMIT).map((occ) => (
              <PlantCard key={occ.id} occurrence={occ} />
            ))}
          </div>
          {occurrences.length > MOBILE_LIST_LIMIT && (
            <Link
              href="/search"
              className="mt-3 flex min-h-11 items-center justify-center rounded-xl text-sm font-medium text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
            >
              Buscar entre todas as {occurrences.length} plantas
            </Link>
          )}
        </BottomSheet>

        {/* Mapa vazio no celular: sem lista ao lado, a tela em branco não diz nada. */}
        {!loading && occurrences.length === 0 && (
          <div className="pointer-events-none absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 lg:hidden">
            <div className="mx-auto flex max-w-xs flex-col items-center gap-1.5 rounded-2xl bg-white/95 p-5 text-center shadow-lg dark:bg-gray-900/95">
              <Leaf className="h-7 w-7 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {loadFailed ? 'Não foi possível carregar as plantas' : 'Nenhuma planta no mapa ainda'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {loadFailed
                  ? 'Confira sua conexão e abra o mapa de novo.'
                  : 'As plantas registradas pela comunidade aparecem aqui.'}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-full w-full bg-green-50 animate-pulse dark:bg-green-950/40" />
        ) : (
          <PlantMap
            occurrences={occurrences}
            initialLat={centerLat}
            initialLng={centerLng}
            initialZoom={initialZoom}
            hoveredOccurrenceId={hoveredId}
            onPinHover={setHoveredId}
          />
        )}
      </div>
    </div>
  )
}
