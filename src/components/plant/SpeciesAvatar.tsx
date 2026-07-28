import Image from 'next/image'
import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpeciesAvatarProps {
  /** `species.image_url` — foto de referência da espécie, distinta da foto de ocorrência. */
  imageUrl?: string | null
  alt: string
  size?: number
  className?: string
}

/**
 * Miniatura circular com a foto de referência de uma espécie, com fallback para
 * um ícone genérico de folha quando `image_url` ainda não foi cadastrado
 * (ver /admin/species → aba "Catálogo de fotos", migration 014).
 */
export default function SpeciesAvatar({ imageUrl, alt, size = 40, className }: SpeciesAvatarProps) {
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-50',
        className
      )}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <Leaf className="text-green-400" style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </div>
  )
}
