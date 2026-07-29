'use client'

import { useEffect, useState } from 'react'

/**
 * Detecta se o dispositivo tem hover de verdade (mouse), não só uma tela
 * larga — `(hover: hover) and (pointer: fine)` é a forma correta de
 * distinguir "tem mouse" de "tela grande", diferente de checar largura
 * (um tablet pode ser largo e não ter hover; alguns laptops são estreitos
 * e têm). Usado para decidir se o balão do pin aparece ao passar o mouse
 * ou só ao tocar/clicar (ver PlantMap.tsx).
 */
export function useHasHover() {
  const [hasHover, setHasHover] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)')
    setHasHover(mql.matches)
    const handler = (e: MediaQueryListEvent) => setHasHover(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return hasHover
}
