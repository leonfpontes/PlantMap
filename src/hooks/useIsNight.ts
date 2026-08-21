'use client'

import { useEffect, useState } from 'react'
import { isNight, msUntilNextSwitch } from '@/lib/mapTheme'

/**
 * Se o relógio do aparelho está na faixa noturna do mapa (ver isNight).
 *
 * Reagenda um único timer para a próxima virada, em vez de conferir a hora de
 * tempos em tempos: quem deixa o app aberto atravessando as 18h vê o mapa
 * escurecer sozinho, e quem não atravessa não paga nada por isso.
 */
export function useIsNight(): boolean {
  // Começa em `false` porque no servidor não há relógio do usuário para
  // consultar, e divergir da marcação inicial quebraria a hidratação. O efeito
  // acerta na primeira passada no cliente.
  const [night, setNight] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const avaliar = () => {
      const agora = new Date()
      setNight(isNight(agora))
      timer = setTimeout(avaliar, msUntilNextSwitch(agora) + 1000)
    }

    avaliar()
    return () => clearTimeout(timer)
  }, [])

  return night
}
