'use client'

import { useState } from 'react'

interface ImageLightboxProps {
  src: string
  alt: string
  children: React.ReactNode
  className?: string
}

/**
 * Envolve uma miniatura clicável que, ao ser tocada, amplia a imagem em um
 * modal de tela cheia (mesmo padrão da foto de ocorrência em /plant/[id]).
 * Usado para a foto de referência da espécie no tooltip do mapa e na tela
 * de detalhes, onde a miniatura é pequena demais para ver detalhes.
 */
export default function ImageLightbox({ src, alt, children, className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={className ?? 'cursor-zoom-in'}
        aria-label={`Ampliar foto de ${alt}`}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  )
}
