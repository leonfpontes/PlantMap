'use client'

import Link from 'next/link'
import { X, CheckCircle } from 'lucide-react'
import { PlantOccurrence } from '@/types'
import Badge from '@/components/ui/Badge'
import SpeciesAvatar from '@/components/plant/SpeciesAvatar'
import ImageLightbox from '@/components/plant/ImageLightbox'

interface PlantTooltipProps {
  occurrence: PlantOccurrence
  onClose: () => void
}

const conditionLabel: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  healthy: { label: 'Saudável', variant: 'green' },
  fair: { label: 'Regular', variant: 'yellow' },
  poor: { label: 'Ruim', variant: 'red' },
  dead: { label: 'Morta', variant: 'gray' },
}

export default function PlantTooltip({ occurrence, onClose }: PlantTooltipProps) {
  const condition = conditionLabel[occurrence.condition] || conditionLabel.healthy

  return (
    <div className="absolute bottom-20 left-4 right-4 z-10 rounded-2xl bg-white p-4 shadow-xl border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {occurrence.species?.image_url ? (
            <ImageLightbox
              src={occurrence.species.image_url}
              alt={occurrence.species.common_name}
              className="flex-shrink-0 cursor-zoom-in"
            >
              <SpeciesAvatar imageUrl={occurrence.species.image_url} alt={occurrence.species.common_name} size={40} />
            </ImageLightbox>
          ) : (
            <SpeciesAvatar imageUrl={null} alt={occurrence.species?.common_name || 'Espécie'} size={40} />
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {occurrence.species?.common_name || 'Espécie desconhecida'}
            </p>
            <p className="text-xs text-gray-500 italic">
              {occurrence.species?.scientific_name}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant={condition.variant}>{condition.label}</Badge>
          {occurrence.verified && (
            <Badge variant="blue">
              <CheckCircle className="mr-1 h-3 w-3" />
              Verificado
            </Badge>
          )}
        </div>
        <Link
          href={`/plant/${occurrence.id}`}
          className="text-xs font-medium text-green-700 hover:underline"
        >
          Ver detalhes →
        </Link>
      </div>
    </div>
  )
}
