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
    <div className="absolute bottom-20 left-4 right-4 z-10 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <X className="h-5 w-5" />
      </button>
      <PlantTooltipContent occurrence={occurrence} />
    </div>
  )
}
