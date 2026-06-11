import Link from 'next/link'
import Image from 'next/image'
import { MapPin, CheckCircle, Leaf } from 'lucide-react'
import { PlantOccurrence, OccurrenceWithDistance } from '@/types'
import Badge from '@/components/ui/Badge'
import { formatDistance } from '@/lib/utils'

interface PlantCardProps {
  occurrence: PlantOccurrence | OccurrenceWithDistance
}

const conditionConfig: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  healthy: { label: 'Saudável', variant: 'green' },
  fair: { label: 'Regular', variant: 'yellow' },
  poor: { label: 'Ruim', variant: 'red' },
  dead: { label: 'Morta', variant: 'gray' },
}

export default function PlantCard({ occurrence }: PlantCardProps) {
  const condition = conditionConfig[occurrence.condition] || conditionConfig.healthy
  const distance = (occurrence as OccurrenceWithDistance).distance_m

  return (
    <Link href={`/plant/${occurrence.id}`}>
      <div className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-green-200 active:scale-[0.98]">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-green-50 flex items-center justify-center">
          {occurrence.photo_url ? (
            <Image
              src={occurrence.photo_url}
              alt={occurrence.species?.common_name || 'Planta'}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <Leaf className="h-7 w-7 text-green-400" />
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <p className="font-semibold text-gray-900 text-sm truncate">
              {occurrence.species?.common_name || 'Espécie desconhecida'}
            </p>
            <p className="text-xs text-gray-500 italic truncate">
              {occurrence.species?.scientific_name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge variant={condition.variant}>{condition.label}</Badge>
            {occurrence.verified && (
              <Badge variant="blue">
                <CheckCircle className="mr-0.5 h-3 w-3" />
                Verificado
              </Badge>
            )}
            {!occurrence.verified && (
              <Badge variant="gray">Comunidade</Badge>
            )}
            {distance !== undefined && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                {formatDistance(distance)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
