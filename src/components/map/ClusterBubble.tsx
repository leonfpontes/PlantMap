'use client'

import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { cn } from '@/lib/utils'

interface ClusterBubbleProps<T> {
  latitude: number
  longitude: number
  items: T[]
  /** Recebe os itens do grupo, pra que o pai possa passar sempre a mesma função (ver memo). */
  onClick: (items: T[]) => void
}

/**
 * Marcador de grupo: substitui N pins que estariam encavalados por uma bolha
 * com a contagem. Clicar aproxima o mapa até o grupo se abrir.
 *
 * O tamanho cresce com a quantidade (em degraus, não contínuo — a leitura é
 * "aqui tem bastante", não uma medida exata), mas com teto: uma bolha que
 * cresce sem limite tapa o mapa que ela deveria estar ajudando a ler.
 */
function tamanhoPara(count: number): number {
  if (count < 5) return 34
  if (count < 15) return 40
  if (count < 50) return 48
  return 56
}

function ClusterBubble<T>({ latitude, longitude, items, onClick }: ClusterBubbleProps<T>) {
  const count = items.length
  const size = tamanhoPara(count)

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick(items)
      }}
    >
      <button
        type="button"
        aria-label={`${count} plantas agrupadas aqui. Toque para ver`}
        className={cn(
          'flex items-center justify-center rounded-full bg-green-600/90 font-semibold text-white',
          'ring-4 ring-green-600/25 shadow-md transition-transform hover:scale-110',
          count >= 50 ? 'text-sm' : 'text-xs'
        )}
        style={{ width: size, height: size }}
      >
        {count}
      </button>
    </Marker>
  )
}

export default memo(ClusterBubble) as typeof ClusterBubble
