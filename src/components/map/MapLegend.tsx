'use client'

import { useState } from 'react'
import { Check, Info } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import { CONDITION_OPTIONS, CONDITION_RING } from '@/constants/plant'

/**
 * Botão "o que significa isso?" do mapa.
 *
 * A condição da planta aparece só no aro do pin (cor + tracejado), e o selo
 * azul e as bolhas com número também não se explicam sozinhos. Sem legenda,
 * quem chega não tem como saber que o aro vermelho tracejado quer dizer
 * "precisa de cuidado".
 */
export default function MapLegend() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="O que os pins do mapa significam"
        // Mesma largura e respiro dos controles de zoom logo acima.
        className="absolute right-[10px] top-[84px] z-10 flex h-[29px] w-[29px] items-center justify-center rounded-[4px] bg-white text-gray-700 shadow-[0_0_0_2px_rgba(0,0,0,0.1)] hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <Info className="h-4 w-4" />
      </button>

      <BottomSheet title="Como ler o mapa" open={open} onClose={() => setOpen(false)}>
        <ul className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-200">
          {CONDITION_OPTIONS.map((o) => {
            const aro = CONDITION_RING[o.value]
            return (
              <li key={o.value} className="flex items-center gap-3">
                <svg viewBox="0 0 100 100" className="h-8 w-8 flex-shrink-0" aria-hidden="true">
                  <circle cx="50" cy="50" r="38" className="fill-green-50 dark:fill-green-950" />
                  <circle
                    cx="50" cy="50" r="41" fill="none"
                    stroke={aro.color} strokeWidth={aro.width * 2.2}
                    strokeDasharray={aro.dash?.split(' ').map((n) => Number(n) * 2.2).join(' ')}
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  <span className="font-semibold">{o.label}</span>
                  {' — '}condição da planta na última visita
                </span>
              </li>
            )
          })}
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white dark:ring-gray-900">
                <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
              </span>
            </span>
            <span><span className="font-semibold">Verificada</span> — confirmada pela administração</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-600/90 text-xs font-semibold text-white ring-4 ring-green-600/25">
              5
            </span>
            <span><span className="font-semibold">Grupo</span> — várias plantas juntas; toque para ver</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          De perto, cada pin mostra a foto da espécie. De longe, vira um ponto colorido.
        </p>
      </BottomSheet>
    </>
  )
}
