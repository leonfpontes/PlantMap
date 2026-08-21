'use client'

import { useEffect, useState } from 'react'
import type { ThemePreference } from '@/types'
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, getStoredTheme } from '@/lib/appearance'

/**
 * A preferência de tema escolhida — 'light', 'dark' ou 'system' —, e não o
 * tema resolvido. Para o resolvido, ver useIsDarkTheme.
 *
 * Ouve o evento próprio do app (mesma aba, ver saveTheme) e o `storage` do
 * navegador (outras abas), porque nenhum dos dois cobre os dois casos.
 */
export function useThemePreference(): ThemePreference {
  // 'system' como valor inicial: é o padrão do app e o que o servidor assume,
  // então a primeira renderização no cliente bate com a marcação.
  const [pref, setPref] = useState<ThemePreference>('system')

  useEffect(() => {
    const ler = () => setPref(getStoredTheme())

    ler()

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) ler()
    }

    window.addEventListener(THEME_CHANGE_EVENT, ler)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, ler)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return pref
}
