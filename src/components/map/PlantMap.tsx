'use client'

import { useState, useCallback } from 'react'
import Map, { NavigationControl, Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LocateFixed } from 'lucide-react'
import { PlantOccurrence } from '@/types'
import PlantPin from './PlantPin'
import PlantTooltip from '@/components/plant/PlantTooltip'
import { useGeolocation } from '@/hooks/useGeolocation'

interface PlantMapProps {
  occurrences?: PlantOccurrence[]
  initialLat?: number
  initialLng?: number
  initialZoom?: number
  onMapClick?: (lat: number, lng: number) => void
  selectedLocation?: { lat: number; lng: number } | null
  interactive?: boolean
}

export default function PlantMap({
  occurrences = [],
  initialLat = -21.1767,
  initialLng = -47.8208,
  initialZoom = 12,
  onMapClick,
  selectedLocation,
  interactive = false,
}: PlantMapProps) {
  const [selectedOccurrence, setSelectedOccurrence] = useState<PlantOccurrence | null>(null)
  const [viewState, setViewState] = useState({
    longitude: initialLng,
    latitude: initialLat,
    zoom: initialZoom,
  })
  const { latitude: userLat, longitude: userLng, getLocation, loading: locLoading } = useGeolocation()

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
            onClick={setSelectedOccurrence}
            selected={selectedOccurrence?.id === occ.id}
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
      </Map>

      <button
        onClick={handleLocate}
        disabled={locLoading}
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-green-400 dark:hover:bg-green-900/30"
      >
        <LocateFixed className="h-5 w-5" />
      </button>

      {selectedOccurrence && !onMapClick && (
        <PlantTooltip
          occurrence={selectedOccurrence}
          onClose={() => setSelectedOccurrence(null)}
        />
      )}
    </div>
  )
}
