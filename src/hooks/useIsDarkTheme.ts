'use client'

import { useEffect, useState } from 'react'

/**
 * Se o app está no tema escuro agora.
 *
 * Observa a classe `dark` no <html>, que é o ponto único por onde as três
 * preferências passam (claro, escuro e automático — ver lib/appearance.ts e o
 * NO_FLASH_SCRIPT). Ler a classe, em vez de reimplementar a decisão a partir
 * do localStorage e do matchMedia, evita que este hook e o resto do app
 * discordem sobre o tema em algum caso de borda.
 */
export function useIsDarkTheme(): boolean {
  // Começa em `false` de propósito: no servidor não há <html> pra consultar, e
  // divergir da marcação inicial quebraria a hidratação. O efeito corrige logo
  // na primeira passada no cliente.
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const ler = () => setIsDark(root.classList.contains('dark'))

    ler()

    const observer = new MutationObserver(ler)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
