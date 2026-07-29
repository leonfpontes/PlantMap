'use client'

import { X } from 'lucide-react'
import { PlantOccurrence } from '@/types'
import PlantTooltipContent from './PlantTooltipContent'

interface PlantTooltipProps {
  occurrence: PlantOccurrence
  onClose: () => void
}

/** Card fixo na base do mapa — usado no toque (sem hover), ver PlantMap.tsx. */
export default function PlantTooltip({ occurrence, onClose }: PlantTooltipProps) {
  return (
    <div className="absolute bottom-20 left-4 right-4 z-10 rounded-2xl bg-white p-4 shadow-xl border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <button
        onClick={onClose}
        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <X className="h-4 w-4" />
      </button>
      <PlantTooltipContent occurrence={occurrence} />
    </div>
  )
}
