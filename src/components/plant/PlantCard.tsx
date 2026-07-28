import Link from 'next/link'
import Image from 'next/image'
import { MapPin, CheckCircle, Leaf } from 'lucide-react'
import { PlantOccurrence, OccurrenceWithDistance } from '@/types'
import Badge from '@/components/ui/Badge'
import { CONDITION_CONFIG } from '@/constants/plant'
import { formatDistance } from '@/lib/utils'

interface PlantCardProps {
  occurrence: PlantOccurrence | OccurrenceWithDistance
}

export default function PlantCard({ occurrence }: PlantCardProps) {
  const condition = CONDITION_CONFIG[occurrence.condition] ?? CONDITION_CONFIG.healthy
  const distance = (occurrence as OccurrenceWithDistance).distance_m
  // Foto da própria ocorrência (tirada pelo usuário) tem prioridade; na falta dela,
  // cai na foto de referência da espécie (species.image_url) em vez do ícone genérico.
  const referenceOnly = !occurrence.photo_url && !!occurrence.species?.image_url
  const thumbnailUrl = occurrence.photo_url || occurrence.species?.image_url

  return (
    <Link href={`/plant/${occurrence.id}`}>
      <div className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-green-200 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-green-800">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-green-50 flex items-center justify-center dark:bg-green-900/30">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={occurrence.species?.common_name || 'Planta'}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <Leaf className="h-7 w-7 text-green-400 dark:text-green-600" />
          )}
          {referenceOnly && (
            <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[9px] font-medium text-white">
              referência
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <p className="font-semibold text-gray-900 text-sm truncate dark:text-gray-100">
              {occurrence.species?.common_name || 'Espécie desconhecida'}
            </p>
            <p className="text-xs text-gray-500 italic truncate dark:text-gray-400">
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
              <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
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
