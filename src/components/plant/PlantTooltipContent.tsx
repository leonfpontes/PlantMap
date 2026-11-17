import Link from 'next/link'
import { CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlantOccurrence } from '@/types'
import Badge from '@/components/ui/Badge'
import SpeciesAvatar from '@/components/plant/SpeciesAvatar'
import ImageLightbox from '@/components/plant/ImageLightbox'

interface PlantTooltipContentProps {
  occurrence: PlantOccurrence
  /** Avatar/tipografia menores, para caber num balão de mapa em vez de um cartão de tela cheia. */
  compact?: boolean
}

const conditionLabel: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  healthy: { label: 'Saudável', variant: 'green' },
  fair: { label: 'Regular', variant: 'yellow' },
  poor: { label: 'Ruim', variant: 'red' },
  dead: { label: 'Morta', variant: 'gray' },
}

/** Conteúdo compartilhado entre o balão do pin (desktop) e o card do mapa (mobile). */
export default function PlantTooltipContent({ occurrence, compact }: PlantTooltipContentProps) {
  const condition = conditionLabel[occurrence.condition] || conditionLabel.healthy
  const avatarSize = compact ? 32 : 40

  return (
    <div>
      {/* Sem compact (cartão do celular) há um X no canto: a folga à direita impede o nome de passar por baixo dele. */}
      <div className={cn('flex items-center gap-3', !compact && 'pr-9')}>
        {occurrence.species?.image_url ? (
          <ImageLightbox
            src={occurrence.species.image_url}
            alt={occurrence.species.common_name}
            className="flex-shrink-0 cursor-zoom-in"
          >
            <SpeciesAvatar imageUrl={occurrence.species.image_url} alt={occurrence.species.common_name} size={avatarSize} />
          </ImageLightbox>
        ) : (
          <SpeciesAvatar imageUrl={null} alt={occurrence.species?.common_name || 'Espécie'} size={avatarSize} />
        )}
        <div className="min-w-0">
          <p className={compact ? 'font-semibold text-gray-900 text-xs dark:text-gray-100' : 'font-semibold text-gray-900 text-sm dark:text-gray-100'}>
            {occurrence.species?.common_name || 'Espécie desconhecida'}
          </p>
          <p className="text-xs text-gray-500 italic truncate dark:text-gray-400">
            {occurrence.species?.scientific_name}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={condition.variant}>{condition.label}</Badge>
          {occurrence.verified && (
            <Badge variant="blue">
              <CheckCircle className="mr-1 h-3 w-3" />
              Verificado
            </Badge>
          )}
        </div>
        {compact && (
          <Link
            href={`/plant/${occurrence.id}`}
            className="flex-shrink-0 text-xs font-medium text-green-700 hover:underline dark:text-green-400"
          >
            Ver detalhes →
          </Link>
        )}
      </div>

      {/* No celular, um botão de verdade: o link de texto pequeno era difícil de acertar com o dedo. */}
      {!compact && (
        <Link
          href={`/plant/${occurrence.id}`}
          className="mt-3 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-green-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-green-800 active:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Ver detalhes
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
