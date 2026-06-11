'use client'

import { useState, useCallback } from 'react'
import Map, { NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
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
  initialLat = -15.77972,
  initialLng = -47.92972,
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
  const { getLocation, loading: locLoading } = useGeolocation()

  const handleLocate = useCallback(() => {
    getLocation()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setViewState((v) => ({
          ...v,
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          zoom: 15,
        }))
      })
    }
  }, [getLocation])

  return (
    <div className="relative h-full w-full">
      <Map
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onClick={(e) => {
          if (onMapClick) {
            onMapClick(e.lngLat.lat, e.lngLat.lng)
          }
          if (!interactive) setSelectedOccurrence(null)
        }}
        cursor={onMapClick ? 'crosshair' : 'grab'}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />

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
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
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
