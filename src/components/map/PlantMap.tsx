'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Map, { NavigationControl, Marker, Source, Layer, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LocateFixed } from 'lucide-react'
import { PlantOccurrence } from '@/types'
import PlantPin from './PlantPin'
import ClusterBubble from './ClusterBubble'
import PlantPinBalloon from './PlantPinBalloon'
import PlantTooltip from '@/components/plant/PlantTooltip'
import { useGeolocationWatch } from '@/hooks/useGeolocation'
import { useHasHover } from '@/hooks/useHasHover'
import { accuracyCircle, formatAccuracy, POOR_ACCURACY_M } from '@/lib/geo'
import { boundsOf, clusterByScreenGrid } from '@/lib/cluster'
import { applyMapTheme, MAP_PALETTE_DARK, MAP_PALETTE_LIGHT } from '@/lib/mapTheme'
import { useIsDarkTheme } from '@/hooks/useIsDarkTheme'
import { useIsNight } from '@/hooks/useIsNight'
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
}: PlantMapProps) {
  const router = useRouter()
  const hasHover = useHasHover()
  const [selectedOccurrence, setSelectedOccurrence] = useState<PlantOccurrence | null>(null)
  const [internalHoveredId, setInternalHoveredId] = useState<string | null>(null)
  const [viewState, setViewState] = useState({
    longitude: initialLng,
    latitude: initialLat,
    zoom: initialZoom,
  })
  // Watch contínuo (e não leitura única): é o que faz o ponto acompanhar quem
  // está andando pelo mapa.
  const {
    latitude: userLat,
    longitude: userLng,
    accuracy: userAccuracy,
    loading: locLoading,
    acquireBestFix,
  } = useGeolocationWatch()

  // Modo "seguir": depois de tocar em localizar, o mapa acompanha o usuário até
  // ele mexer no mapa com a mão. Sem isso, quem toca em localizar e sai andando
  // vê o próprio ponto escapar da tela.
  const [following, setFollowing] = useState(false)

  // O mapa escurece à noite por conta própria, como fazem os apps de
  // navegação: quem usa isso no mato às 20h não quer uma tela branca na cara.
  // O tema escuro do app também força escuro, senão um mapa claro de dia
  // dentro de uma interface escura traria de volta o descasamento.
  const temaEscuro = useIsDarkTheme()
  const noite = useIsNight()
  // Os dois hooks são chamados sempre, e não dentro de um `||`: curto-circuito
  // pularia o segundo e mudaria a ordem dos hooks entre renders.
  const isDark = temaEscuro || noite

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
  const handleLocate = useCallback(async () => {
    setFollowing(true)
    if (userLat != null && userLng != null) {
      setViewState((v) => ({ ...v, longitude: userLng, latitude: userLat, zoom: Math.max(v.zoom, 17) }))
    }
    const fix = await acquireBestFix()
    if (fix) {
      setViewState((v) => ({
        ...v,
        longitude: fix.longitude,
        latitude: fix.latitude,
        zoom: Math.max(v.zoom, 17),
      }))
    }
  }, [userLat, userLng, acquireBestFix])

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
    setViewState((v) => ({ ...v, longitude: userLng, latitude: userLat }))
  }, [following, userLat, userLng])

  // Agrupa pelo zoom, não pelo centro: o resultado não muda ao arrastar o
  // mapa, então panorâmica não recalcula nada.
  const clusters = useMemo(
    () => clusterByScreenGrid(occurrences, viewState.zoom, CLUSTER_CELL_PX),
    [occurrences, viewState.zoom]
  )

  const pinVariant = viewState.zoom >= MEDALLION_ZOOM ? 'medallion' : 'dot'

  // Clicar num grupo aproxima até ele caber na tela — é o gesto que o usuário
  // já espera de uma bolha com número, e evita o beco sem saída de um cluster
  // que não abre.
  const handleClusterClick = useCallback((items: PlantOccurrence[]) => {
    const b = boundsOf(items)
    if (!b) return
    setFollowing(false)
    mapRef.current?.fitBounds(
      [[b.west, b.south], [b.east, b.north]],
      { padding: 80, maxZoom: MEDALLION_ZOOM + 2, duration: 500 }
    )
  }, [])

  const hoveredOccurrence = hasHover && effectiveHoveredId
    ? occurrences.find((o) => o.id === effectiveHoveredId) ?? null
    : null

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        // originalEvent só existe quando o movimento veio de gesto; movimento
        // programático (o próprio follow) não pode desligar o follow.
        onMoveStart={(e) => { if (e.originalEvent) setFollowing(false) }}
        onLoad={aplicarTema}
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

        {clusters.map((cluster) =>
          cluster.items.length > 1 ? (
            <ClusterBubble
              key={cluster.id}
              latitude={cluster.latitude}
              longitude={cluster.longitude}
              count={cluster.items.length}
              onClick={() => handleClusterClick(cluster.items)}
            />
          ) : (
            <PlantPin
              key={cluster.items[0].id}
              occurrence={cluster.items[0]}
              variant={pinVariant}
              onClick={handlePinClick}
              selected={selectedOccurrence?.id === cluster.items[0].id}
              highlighted={effectiveHoveredId === cluster.items[0].id}
              onHover={(hovering) => (hovering ? hoverNow(cluster.items[0].id) : clearHoverSoon())}
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
        />
      )}
    </div>
  )
}
