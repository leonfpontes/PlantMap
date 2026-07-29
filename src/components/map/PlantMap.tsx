'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Map, { NavigationControl, Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LocateFixed } from 'lucide-react'
import { PlantOccurrence } from '@/types'
import PlantPin from './PlantPin'
import PlantPinBalloon from './PlantPinBalloon'
import PlantTooltip from '@/components/plant/PlantTooltip'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useHasHover } from '@/hooks/useHasHover'

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
  const { latitude: userLat, longitude: userLng, getLocation, loading: locLoading } = useGeolocation()

  // Controlado (lista ao lado, tela desktop) quando onPinHover é passado; senão o próprio
  // mapa cuida do próprio hover (ex.: pin único da tela de detalhe).
  const effectiveHoveredId = onPinHover ? hoveredOccurrenceId ?? null : internalHoveredId

  // Pequeno atraso pra fechar o balão evita o "piscar" ao mover o mouse do pin pro
  // próprio balão (ex.: pra clicar em "Ver detalhes") — sem isso, o gap de alguns
  // pixels entre os dois já fecha o balão antes do mouse chegar lá.
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleLocate = useCallback(() => {
    if (userLat && userLng) {
      setViewState((v) => ({
        ...v,
        longitude: userLng,
        latitude: userLat,
        zoom: 15,
      }))
    } else {
      getLocation()
    }
  }, [userLat, userLng, getLocation])

  const hoveredOccurrence = hasHover && effectiveHoveredId
    ? occurrences.find((o) => o.id === effectiveHoveredId) ?? null
    : null

  return (
    <div className="relative h-full w-full">
      <Map
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
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

        {userLat && userLng && (
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <div className="relative flex h-6 w-6 items-center justify-center">
              <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></div>
              <div className="relative h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
            </div>
          </Marker>
        )}

        {occurrences.map((occ) => (
          <PlantPin
            key={occ.id}
            occurrence={occ}
            onClick={handlePinClick}
            selected={selectedOccurrence?.id === occ.id}
            highlighted={effectiveHoveredId === occ.id}
            onHover={(hovering) => (hovering ? hoverNow(occ.id) : clearHoverSoon())}
          />
        ))}

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

      <button
        onClick={handleLocate}
        disabled={locLoading}
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-green-400 dark:hover:bg-green-900/30"
      >
        <LocateFixed className="h-5 w-5" />
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
