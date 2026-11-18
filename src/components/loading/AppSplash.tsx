'use client'

import { useEffect, useState } from 'react'
import SproutLoader from '@/components/loading/SproutLoader'
import { cn } from '@/lib/utils'

/**
 * Tela de abertura do app: cobre tudo enquanto o mapa ainda não tem o que
 * mostrar. Antes, quem abria o app via uns 5 segundos de fundo verde vazio
 * e não sabia se estava carregando ou travado.
 *
 * Some com um esmaecer curto quando `ready` vira true. Quem decide o que é
 * "pronto" é a tela do mapa (MapView).
 */
export default function AppSplash({ ready, label }: { ready: boolean; label: string }) {
  // Continua montada durante o esmaecer, e só sai da árvore depois dele.
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setGone(true), 350)
    return () => clearTimeout(t)
  }, [ready])

  if (gone) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-white transition-opacity duration-300 dark:bg-gray-950',
        ready && 'pointer-events-none opacity-0'
      )}
      aria-hidden={ready}
    >
      <SproutLoader label={label} />
      <p className="text-lg font-bold tracking-tight text-green-800 dark:text-green-400">PlantMap</p>
    </div>
  )
}
