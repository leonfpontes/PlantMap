'use client'

import { Marker } from 'react-map-gl/mapbox'
import { PlantOccurrence } from '@/types'
import { cn } from '@/lib/utils'

interface PlantPinProps {
  occurrence: PlantOccurrence
  onClick: (occurrence: PlantOccurrence) => void
  selected?: boolean
}

const conditionColor: Record<string, string> = {
  healthy: 'bg-green-500 border-green-700',
  fair: 'bg-yellow-400 border-yellow-600',
  poor: 'bg-orange-400 border-orange-600',
  dead: 'bg-gray-400 border-gray-600',
}

export default function PlantPin({ occurrence, onClick, selected }: PlantPinProps) {
  return (
    <Marker
      longitude={occurrence.longitude}
      latitude={occurrence.latitude}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick(occurrence)
      }}
    >
      <div className="cursor-pointer">
        <div
          className={cn(
            'h-5 w-5 rounded-full border-2 shadow-md transition-transform',
            conditionColor[occurrence.condition] || conditionColor.healthy,
            selected && 'scale-150 shadow-lg'
          )}
        />
        <div className={cn(
          'mx-auto h-2 w-0.5',
          occurrence.condition === 'dead' ? 'bg-gray-400' : 'bg-green-700'
        )} />
      </div>
    </Marker>
  )
}
