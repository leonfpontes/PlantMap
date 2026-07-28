'use client'

import { useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { applyTheme, getStoredTheme, saveFontScale, saveTheme } from '@/lib/appearance'
import { getAppearancePrefs } from '@/lib/actions/appearance'

/**
 * Componente invisível montado uma vez no layout raiz. Cuida de dois casos
 * que o script de "no-flash" no <head> não resolve sozinho:
 * 1. Modo 'Automático': reagir caso o SO mude de claro/escuro com o app aberto.
 * 2. Usuário logado: puxar a preferência salva na conta pra este aparelho
 *    (ex.: primeiro acesso em um celular novo, sem nada no localStorage ainda).
 */
export default function AppearanceSync() {
  const { user } = useUser()

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (getStoredTheme() === 'system') applyTheme('system')
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!user) return
    getAppearancePrefs().then((prefs) => {
      if (!prefs) return
      saveTheme(prefs.theme)
      saveFontScale(prefs.fontScale)
    })
  }, [user])

  return null
}
