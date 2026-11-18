'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Map, { NavigationControl, Marker, Source, Layer, type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LocateFixed, MapPin } from 'lucide-react'
import { PlantOccurrence } from '@/types'
import PlantPin from './PlantPin'
import ClusterBubble from './ClusterBubble'
import PlantPinBalloon from './PlantPinBalloon'
import PlantTooltip from '@/components/plant/PlantTooltip'
import { useGeolocationWatch, useLocationPermission } from '@/hooks/useGeolocation'
import { useHasHover } from '@/hooks/useHasHover'
import { accuracyCircle, distanceMeters, formatAccuracy, POOR_ACCURACY_M } from '@/lib/geo'
import {
  boundsOf,
  clusterByScreenGrid,
  clusterZoomLevel,
  expandBounds,
  inBounds,
  staysClusteredAt,
  type GeoBounds,
} from '@/lib/cluster'
import BottomSheet from '@/components/ui/BottomSheet'
import PlantCard from '@/components/plant/PlantCard'
import { applyMapTheme, MAP_PALETTE_DARK, MAP_PALETTE_LIGHT, shouldUseDarkMap } from '@/lib/mapTheme'
import { useIsDarkTheme } from '@/hooks/useIsDarkTheme'
import { useIsNight } from '@/hooks/useIsNight'
import { useThemePreference } from '@/hooks/useThemePreference'
import { cn } from '@/lib/utils'

/**
 * A partir daqui o pin mostra a foto da espécie. Abaixo disso ele é um ponto:
 * de longe a foto não seria legível de qualquer forma, e carregar dezenas de
 * imagens pra desenhar 12 pixels cada é desperdício puro.
 */
const MEDALLION_ZOOM = 15

/**
 * Lado da célula de agrupamento, em pixels — da ordem do diâmetro do
 * medalhão, que é a distância a partir da qual dois pins se atrapalham.
 */
const CLUSTER_CELL_PX = 54

/**
 * Quanto o zoom precisa ficar parado num nível novo antes de os grupos serem
 * refeitos. Curto o bastante pra parecer imediato ao soltar a pinça, longo o
 * bastante pra não reagrupar no meio do gesto.
 */
const CLUSTER_SETTLE_MS = 180

/** Zoom máximo ao abrir um grupo — perto o bastante pra mostrar os medalhões. */
const CLUSTER_OPEN_MAX_ZOOM = MEDALLION_ZOOM + 2

/**
 * Folga, em fração da tela para cada lado, dos pins desenhados fora da área
 * visível. Os de longe não existem na página; os da folga já estão prontos
 * quando o arrasto os traz pra dentro.
 */
const OFFSCREEN_MARGIN = 0.5

interface PlantMapProps {
  occurrences?: PlantOccurrence[]
  initialLat?: number
  initialLng?: number
  initialZoom?: number
  onMapClick?: (lat: number, lng: number) => void
  selectedLocation?: { lat: number; lng: number } | null
  interactive?: boolean
  /** Id de ocorrência realçada por fora (ex.: hover num card da lista, na tela desktop). */
  hoveredOccurrenceId?: string | null
  /** Avisa quando o mouse entra/sai de um pin, para realçar o card correspondente na lista. */
  onPinHover?: (id: string | null) => void
  /**
   * Explica antes de o navegador pedir a localização (mapa principal). Sem
   * isso, o pedido do sistema aparecia sem contexto ao abrir o app e muita
   * gente negava — e o "perto de mim" deixava de funcionar.
   */
  askLocationFirst?: boolean
  /**
   * Na primeira leitura do GPS, leva o mapa até a pessoa (mapa principal).
   * Não mexe se ela já arrastou ou deu zoom com a mão antes disso.
   */
  centerOnUser?: boolean
  /**
   * As plantas já chegaram do servidor. A centralização espera por isso para
   * escolher o zoom pela planta mais próxima (sem elas, não há como saber).
   */
  dataReady?: boolean
  /** Avisa quando o mapa terminou de desenhar pela primeira vez. */
  onReady?: () => void
}

/**
 * Zoom ao centralizar na pessoa: perto o bastante para ver as plantas mais
 * próximas. Com uma a 500 m dá rua (15, já com as fotos nos pins); com a mais
 * perto a quilômetros, abre o bastante para ela aparecer — sem passar do
 * nível de cidade.
 */
export function zoomAroundUser(nearestM: number): number {
  if (!Number.isFinite(nearestM)) return 15
  const km = Math.max(nearestM, 50) / 1000
  return Math.min(15, Math.max(11, Math.floor(Math.log2(20000 / km)) - 1))
}

const LOCATION_OK_KEY = 'plantmap:location-ok'
const LOCATION_LATER_KEY = 'plantmap:location-later'

function lerFlag(storage: 'local' | 'session', key: string): boolean {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key) === '1'
  } catch {
    return false
  }
}

function gravarFlag(storage: 'local' | 'session', key: string) {
  try {
    (storage === 'local' ? localStorage : sessionStorage).setItem(key, '1')
  } catch {
    // Sem armazenamento: o pré-pedido só volta a aparecer na próxima visita.
  }
}

export default function PlantMap({
  occurrences = [],
  initialLat = -21.1767,
  initialLng = -47.8208,
  initialZoom = 12,
  onMapClick,
  selectedLocation,
  interactive = false,
  hoveredOccurrenceId,
  onPinHover,
  askLocationFirst = false,
  centerOnUser = false,
  dataReady = true,
  onReady,
}: PlantMapProps) {
  const router = useRouter()
  const hasHover = useHasHover()
  const [selectedOccurrence, setSelectedOccurrence] = useState<PlantOccurrence | null>(null)
  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null)
  // O mapa cuida da própria câmera (modo não controlado). Antes a posição
  // vivia num estado do React atualizado a cada quadro do arrasto, e cada
  // quadro redesenhava a árvore inteira — todos os pins juntos. Em celular
  // fraco era isso que travava. Agora o React só fica sabendo do que muda a
  // aparência: o nível de zoom (inteiro) e o recorte visível quando o gesto
  // termina.
  const [initialViewState] = useState(() => ({
    longitude: initialLng,
    latitude: initialLat,
    zoom: initialZoom,
  }))
  const [zoomLevel, setZoomLevel] = useState(() => clusterZoomLevel(initialZoom))
  const [pinVariant, setPinVariant] = useState<'dot' | 'medallion'>(
    initialZoom >= MEDALLION_ZOOM ? 'medallion' : 'dot'
  )
  const [visibleBounds, setVisibleBounds] = useState<GeoBounds | null>(null)
  // Grupo que nem o zoom máximo separa: abre como lista (ver handleClusterClick).
  const [stackedItems, setStackedItems] = useState<PlantOccurrence[] | null>(null)
  // Pré-pedido de localização (só no mapa principal, ver askLocationFirst).
  const permissao = useLocationPermission()
  const [consentiu, setConsentiu] = useState(false)
  const [adiou, setAdiou] = useState(false)
  useEffect(() => {
    setConsentiu(lerFlag('local', LOCATION_OK_KEY))
    setAdiou(lerFlag('session', LOCATION_LATER_KEY))
  }, [])
  // Negada também "libera": o navegador não pergunta de novo, e o erro que
  // volta é o que acende o aviso "Localização desligada" no mapa.
  const gpsLiberado = !askLocationFirst || permissao === 'granted' || permissao === 'denied' || consentiu
  const mostrarPrePedido = askLocationFirst && !gpsLiberado && !adiou

  const liberarGps = useCallback(() => {
    gravarFlag('local', LOCATION_OK_KEY)
    setConsentiu(true)
  }, [])

  // Watch contínuo (e não leitura única): é o que faz o ponto acompanhar quem
  // está andando pelo mapa.
  const {
    latitude: userLat,
    longitude: userLng,
    accuracy: userAccuracy,
    loading: locLoading,
    acquireBestFix,
  } = useGeolocationWatch(gpsLiberado)

  // Modo "seguir": depois de tocar em localizar, o mapa acompanha o usuário até
  // ele mexer no mapa com a mão. Sem isso, quem toca em localizar e sai andando
  // vê o próprio ponto escapar da tela.
  const [following, setFollowing] = useState(false)

  // No 'automático', o mapa escurece à noite por conta própria, como fazem os
  // apps de navegação: quem usa isso no mato às 20h não quer uma tela branca
  // na cara. Escolha explícita de tema continua mandando — ver
  // shouldUseDarkMap para a regra inteira.
  const preferencia = useThemePreference()
  const temaEscuro = useIsDarkTheme()
  const noite = useIsNight()
  const isDark = shouldUseDarkMap(preferencia, temaEscuro, noite)

  // Controlado (lista ao lado, tela desktop) quando onPinHover é passado; senão o próprio
  // mapa cuida do próprio hover (ex.: pin único da tela de detalhe).
  const effectiveHoveredId = onPinHover ? hoveredOccurrenceId ?? null : internalHoveredId

  // Pequeno atraso pra fechar o balão evita o "piscar" ao mover o mouse do pin pro
  // próprio balão (ex.: pra clicar em "Ver detalhes") — sem isso, o gap de alguns
  // pixels entre os dois já fecha o balão antes do mouse chegar lá.
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Instância do mapa: fitBounds anima o enquadramento ao abrir um cluster,
  // coisa que setViewState sozinho não faz (saltaria sem transição).
  const mapRef = useRef<MapRef | null>(null)

  const setHovered = useCallback((id: string | null) => {
    if (onPinHover) onPinHover(id)
    else setInternalHoveredId(id)
  }, [onPinHover])

  const hoverNow = useCallback((id: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setHovered(id)
  }, [setHovered])

  const clearHoverSoon = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = setTimeout(() => setHovered(null), 120)
  }, [setHovered])

  const handlePinHover = useCallback((id: string, hovering: boolean) => {
    if (hovering) hoverNow(id)
    else clearHoverSoon()
  }, [hoverNow, clearHoverSoon])

  const handlePinClick = useCallback((occ: PlantOccurrence) => {
    if (hasHover) {
      router.push(`/plant/${occ.id}`)
    } else {
      setSelectedOccurrence(occ)
    }
  }, [hasHover, router])

  // Recentra já no que tiver (resposta imediata ao toque) e, em paralelo, pede
  // um fix melhor — antes o botão só recentrava na leitura antiga e nunca
  // pedia uma nova quando já existia alguma, então ficava preso nela.
  const centerOn = useCallback((lng: number, lat: number, minZoom?: number) => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({
      center: [lng, lat],
      zoom: minZoom != null ? Math.max(map.getZoom(), minZoom) : undefined,
      duration: 400,
    })
  }, [])

  const handleLocate = useCallback(async () => {
    // Tocar em localizar já é o "sim" para a localização.
    liberarGps()
    setFollowing(true)
    if (userLat != null && userLng != null) centerOn(userLng, userLat, 17)
    const fix = await acquireBestFix()
    if (fix) centerOn(fix.longitude, fix.latitude, 17)
  }, [userLat, userLng, acquireBestFix, centerOn, liberarGps])

  // Recolore o mapa base pro tema do app (ver lib/mapTheme.ts). Precisa rodar
  // no load e a cada troca de tema; antes do estilo carregar não há camada
  // nenhuma pra pintar, e o onLoad cobre esse primeiro caso.
  const aplicarTema = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map?.isStyleLoaded()) return
    applyMapTheme(map, isDark ? MAP_PALETTE_DARK : MAP_PALETTE_LIGHT)
  }, [isDark])

  useEffect(aplicarTema, [aplicarTema])

  // Enquanto estiver seguindo, cada leitura nova reposiciona o mapa.
  useEffect(() => {
    if (!following || userLat == null || userLng == null) return
    centerOn(userLng, userLat)
  }, [following, userLat, userLng, centerOn])

  // Chamado a cada quadro do gesto, então só grava estado quando o valor
  // muda de fato — com o mesmo valor o React nem redesenha.
  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    const z = e.viewState.zoom
    setZoomLevel(clusterZoomLevel(z))
    setPinVariant(z >= MEDALLION_ZOOM ? 'medallion' : 'dot')
  }, [])

  const updateVisibleBounds = useCallback(() => {
    const b = mapRef.current?.getBounds()
    if (!b) return
    setVisibleBounds(expandBounds(
      { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
      OFFSCREEN_MARGIN
    ))
  }, [])

  const [mapLoaded, setMapLoaded] = useState(false)
  const handleLoad = useCallback(() => {
    aplicarTema()
    updateVisibleBounds()
    setMapLoaded(true)
    onReady?.()
  }, [aplicarTema, updateVisibleBounds, onReady])

  // Centraliza na pessoa uma vez, na primeira leitura do GPS. Antes o mapa
  // abria no centro padrão (Ribeirão Preto) e ficava lá mesmo depois de o GPS
  // responder, porque a posição chegava depois de o mapa já ter aberto.
  const centrouNoUsuario = useRef(false)
  const gestoDoUsuario = useRef(false)
  useEffect(() => {
    if (!centerOnUser || centrouNoUsuario.current || !mapLoaded || !dataReady) return
    if (userLat == null || userLng == null) return
    centrouNoUsuario.current = true
    if (gestoDoUsuario.current) return
    let maisPerto = Infinity
    for (const o of occurrences) {
      const d = distanceMeters({ latitude: userLat, longitude: userLng }, o)
      if (d < maisPerto) maisPerto = d
    }
    mapRef.current?.easeTo({ center: [userLng, userLat], zoom: zoomAroundUser(maisPerto), duration: 600 })
  }, [centerOnUser, mapLoaded, dataReady, userLat, userLng, occurrences])

  // Zoom usado no agrupamento: inteiro e só atualizado quando o gesto assenta.
  // Antes o agrupamento usava o zoom fracionado de cada quadro da pinça — as
  // células da grade mudavam de tamanho continuamente, os grupos se refaziam a
  // cada quadro e todas as bolhas eram desmontadas e remontadas (a key leva a
  // contagem). Era isso que fazia os balões piscarem, sumirem e embaralharem
  // durante o zoom. Com nível inteiro + espera curta, a composição só muda
  // depois que o usuário solta o gesto, uma vez.
  const [clusterZoom, setClusterZoom] = useState(zoomLevel)
  useEffect(() => {
    if (zoomLevel === clusterZoom) return
    const t = setTimeout(() => setClusterZoom(zoomLevel), CLUSTER_SETTLE_MS)
    return () => clearTimeout(t)
  }, [zoomLevel, clusterZoom])

  // Agrupa pelo zoom, não pelo centro: o resultado não muda ao arrastar o
  // mapa, então panorâmica não recalcula nada.
  const clusters = useMemo(
    () => clusterByScreenGrid(occurrences, clusterZoom, CLUSTER_CELL_PX),
    [occurrences, clusterZoom]
  )

  // Só os grupos perto da tela viram elementos na página. Antes do primeiro
  // recorte (mapa ainda carregando) desenha tudo, como sempre foi.
  const visibleClusters = useMemo(
    () => visibleBounds
      ? clusters.filter((c) => inBounds(c, visibleBounds))
      : clusters,
    [clusters, visibleBounds]
  )

  // Clicar num grupo aproxima até ele caber na tela — é o gesto que o usuário
  // já espera de uma bolha com número, e evita o beco sem saída de um cluster
  // que não abre.
  const handleClusterClick = useCallback((items: PlantOccurrence[]) => {
    const b = boundsOf(items)
    if (!b) return
    setFollowing(false)
    // Se nem o zoom máximo separa o grupo (plantas com localização aproximada
    // caem todas na mesma coordenada), aproximar seria um beco sem saída:
    // a bolha continuaria lá. Nesse caso mostra a lista do que tem ali.
    if (staysClusteredAt(items, CLUSTER_OPEN_MAX_ZOOM, CLUSTER_CELL_PX)) {
      setSelectedOccurrence(null)
      setStackedItems(items)
      return
    }
    mapRef.current?.fitBounds(
      [[b.west, b.south], [b.east, b.north]],
      { padding: 80, maxZoom: CLUSTER_OPEN_MAX_ZOOM, duration: 500 }
    )
  }, [])

  const hoveredOccurrence = hasHover && effectiveHoveredId
    ? occurrences.find((o) => o.id === effectiveHoveredId) ?? null
    : null

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        onMove={handleMove}
        onMoveEnd={updateVisibleBounds}
        // originalEvent só existe quando o movimento veio de gesto; movimento
        // programático (o próprio follow) não pode desligar o follow.
        onMoveStart={(e) => {
          if (e.originalEvent) {
            setFollowing(false)
            gestoDoUsuario.current = true
          }
        }}
        onLoad={handleLoad}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onClick={(e) => {
          if (onMapClick) {
            onMapClick(e.lngLat.lat, e.lngLat.lng)
          }
          if (!interactive) setSelectedOccurrence(null)
        }}
        cursor={onMapClick ? 'crosshair' : 'grab'}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* Halo de precisão: o raio é desenhado em metros reais, então encolhe
            e cresce junto com o zoom e mostra honestamente o quanto o ponto
            pode estar errado. */}
        {userLat != null && userLng != null && userAccuracy != null && (
          <Source
            id="user-accuracy"
            type="geojson"
            data={accuracyCircle(userLat, userLng, userAccuracy)}
          >
            <Layer
              id="user-accuracy-fill"
              type="fill"
              paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.12 }}
            />
            <Layer
              id="user-accuracy-line"
              type="line"
              paint={{ 'line-color': '#3b82f6', 'line-opacity': 0.35, 'line-width': 1 }}
            />
          </Source>
        )}

        {userLat != null && userLng != null && (
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <div className="relative flex h-6 w-6 items-center justify-center">
              <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></div>
              <div className="relative h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
            </div>
          </Marker>
        )}

        {visibleClusters.map((cluster) =>
          cluster.items.length > 1 ? (
            <ClusterBubble
              key={cluster.id}
              latitude={cluster.latitude}
              longitude={cluster.longitude}
              items={cluster.items}
              onClick={handleClusterClick}
            />
          ) : (
            <PlantPin
              key={cluster.items[0].id}
              occurrence={cluster.items[0]}
              variant={pinVariant}
              onClick={handlePinClick}
              selected={selectedOccurrence?.id === cluster.items[0].id}
              highlighted={effectiveHoveredId === cluster.items[0].id}
              onHover={handlePinHover}
            />
          )
        )}

        {selectedLocation && (
          <PlantPin
            occurrence={{
              id: 'selected',
              latitude: selectedLocation.lat,
              longitude: selectedLocation.lng,
              condition: 'healthy',
              stage: 'adult',
              verified: false,
              notes: null,
              photo_url: null,
              species_id: '',
              user_id: '',
              created_at: '',
              updated_at: '',
            }}
            onClick={() => {}}
          />
        )}

        {hoveredOccurrence && !onMapClick && (
          <PlantPinBalloon
            occurrence={hoveredOccurrence}
            onMouseEnter={() => hoverNow(hoveredOccurrence.id)}
            onMouseLeave={clearHoverSoon}
          />
        )}
      </Map>

      {/* Precisão à vista: sem esse número não dá pra saber se o ponto azul
          está a 5 m ou a 2 km de onde a pessoa realmente está. */}
      {userAccuracy != null && (
        <span
          className={cn(
            'absolute bottom-4 left-4 rounded-full px-2.5 py-1 text-xs font-medium shadow-md',
            userAccuracy > POOR_ACCURACY_M
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300'
          )}
        >
          Precisão {formatAccuracy(userAccuracy)}
        </span>
      )}

      <button
        // O mapa é renderizado dentro do <form> de registro, e botão sem type
        // dentro de form é submit: sem isso, tocar em localizar mandava o
        // formulário em vez de localizar.
        type="button"
        onClick={handleLocate}
        disabled={locLoading}
        aria-label={following ? 'Seguindo sua localização' : 'Centralizar na minha localização'}
        aria-pressed={following}
        className={cn(
          'absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full shadow-md border transition-colors disabled:opacity-50',
          following
            ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
            : 'border-gray-200 bg-white text-green-700 hover:bg-green-50 dark:bg-gray-900 dark:border-gray-700 dark:text-green-400 dark:hover:bg-green-900/30'
        )}
      >
        <LocateFixed className={cn('h-5 w-5', locLoading && 'animate-pulse')} />
      </button>

      {!hasHover && selectedOccurrence && !onMapClick && (
        <PlantTooltip
          occurrence={selectedOccurrence}
          onClose={() => setSelectedOccurrence(null)}
          distanceM={userLat != null && userLng != null
            ? distanceMeters({ latitude: userLat, longitude: userLng }, selectedOccurrence)
            : null}
        />
      )}

      {mostrarPrePedido && (
        <div className="absolute inset-x-4 bottom-20 z-20 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Ver plantas perto de você?</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                Usamos sua localização só para mostrar onde você está e a distância até cada planta. Ela não é
                compartilhada.
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { gravarFlag('session', LOCATION_LATER_KEY); setAdiou(true) }}
              className="min-h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={liberarGps}
              className="min-h-11 rounded-xl bg-green-700 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700"
            >
              Ativar localização
            </button>
          </div>
        </div>
      )}

      <BottomSheet
        title={stackedItems ? `${stackedItems.length} plantas neste ponto` : undefined}
        open={stackedItems != null}
        onClose={() => setStackedItems(null)}
      >
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Estão tão próximas (ou com localização aproximada) que no mapa ocupam o mesmo lugar.
        </p>
        <div className="-mx-1 flex max-h-[55dvh] flex-col gap-2 overflow-y-auto px-1 pb-1">
          {stackedItems?.map((occ) => (
            <PlantCard key={occ.id} occurrence={occ} />
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
