'use client'

import { Popup } from 'react-map-gl/maplibre'
import { PlantOccurrence } from '@/types'
import PlantTooltipContent from '@/components/plant/PlantTooltipContent'

interface PlantPinBalloonProps {
  occurrence: PlantOccurrence
  onMouseEnter: () => void
  onMouseLeave: () => void
}

/**
 * Balão sobre o pin, só para quem tem mouse de verdade (ver useHasHover em
 * PlantMap.tsx) — substitui o card fixo na base da tela nesse caso. Fica
 * ancorado nas coordenadas do pin via `Popup` do MapLibre, que se
 * reposiciona sozinho perto das bordas do mapa.
 *
 * onMouseEnter/onMouseLeave no próprio balão mantêm o hover "vivo" quando o
 * mouse sai do pin em direção ao balão (ex.: pra clicar em "Ver detalhes"),
 * em vez de fechar assim que sai de cima do pin.
 */
export default function PlantPinBalloon({ occurrence, onMouseEnter, onMouseLeave }: PlantPinBalloonProps) {
  return (
    <Popup
      longitude={occurrence.longitude}
      latitude={occurrence.latitude}
      anchor="bottom"
      offset={18}
      closeButton={false}
      closeOnClick={false}
      className="plant-balloon"
    >
      <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="w-56 p-3">
        <PlantTooltipContent occurrence={occurrence} compact />
      </div>
    </Popup>
  )
}
