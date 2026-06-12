'use client'

import { Marker } from 'react-map-gl/maplibre'
import { PlantOccurrence } from '@/types'
import { CONDITION_PIN_CLASS } from '@/constants/plant'
import { cn } from '@/lib/utils'

interface PlantPinProps {
  occurrence: PlantOccurrence
  onClick: (occurrence: PlantOccurrence) => void
  selected?: boolean
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
            CONDITION_PIN_CLASS[occurrence.condition] ?? CONDITION_PIN_CLASS.healthy,
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
