'use client'

import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveTheme, saveFontScale } from '@/lib/appearance'
import { updateAppearancePrefs } from '@/lib/actions/appearance'
import type { FontScale, ThemePreference } from '@/types'

interface AppearanceSettingsProps {
  initialTheme: ThemePreference
  initialFontScale: FontScale
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor },
]

const FONT_SCALE_OPTIONS: { value: FontScale; label: string; sizeClass: string }[] = [
  { value: 'normal', label: 'Padrão', sizeClass: 'text-sm' },
  { value: 'large', label: 'Grande', sizeClass: 'text-base' },
  { value: 'xlarge', label: 'Extra grande', sizeClass: 'text-lg' },
]

/**
 * Tela de Aparência: tema e tamanho de texto aplicam na hora (sem botão
 * "salvar"), e persistem na conta para acompanhar o usuário entre aparelhos
 * (ver src/lib/actions/appearance.ts e migration 017).
 */
export default function AppearanceSettings({ initialTheme, initialFontScale }: AppearanceSettingsProps) {
  const [theme, setTheme] = useState(initialTheme)
  const [fontScale, setFontScale] = useState(initialFontScale)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Debounce: cliques rápidos entre opções disparavam várias gravações em
  // paralelo, que podiam chegar ao banco fora de ordem — a última escolha na
  // tela nem sempre era a que persistia (mesmo bug encontrado em Privacidade).
  // Só a opção em que o usuário "parou" por 400ms é enviada, uma de cada vez.
  const pendingTheme = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFontScale = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pendingTheme.current) clearTimeout(pendingTheme.current)
      if (pendingFontScale.current) clearTimeout(pendingFontScale.current)
    }
  }, [])

  const handleTheme = (value: ThemePreference) => {
    setTheme(value)
    saveTheme(value)
    setSaveError(null)

    if (pendingTheme.current) clearTimeout(pendingTheme.current)
    pendingTheme.current = setTimeout(async () => {
      const result = await updateAppearancePrefs({ theme: value })
      if (result.error) setSaveError(result.error)
    }, 400)
  }

  const handleFontScale = (value: FontScale) => {
    setFontScale(value)
    saveFontScale(value)
    setSaveError(null)

    if (pendingFontScale.current) clearTimeout(pendingFontScale.current)
    pendingFontScale.current = setTimeout(async () => {
      const result = await updateAppearancePrefs({ fontScale: value })
      if (result.error) setSaveError(result.error)
    }, 400)
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Tema</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTheme(value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors',
                  selected
                    ? 'border-green-700 bg-green-50 dark:border-green-500 dark:bg-green-900/30'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
                )}
              >
                {selected && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-green-700 dark:bg-green-500">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <Icon className={cn('h-6 w-6', selected ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400')} />
                <span className={cn('text-xs font-medium', selected ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300')}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          No automático, o app segue o tema do seu celular.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Tamanho do texto</h2>
        <div className="grid grid-cols-3 gap-2">
          {FONT_SCALE_OPTIONS.map(({ value, label, sizeClass }) => {
            const selected = fontScale === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleFontScale(value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors',
                  selected
                    ? 'border-green-700 bg-green-50 dark:border-green-500 dark:bg-green-900/30'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
                )}
              >
                {selected && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-green-700 dark:bg-green-500">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <span className={cn('font-bold', sizeClass, selected ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300')}>
                  Aa
                </span>
                <span className={cn('text-xs font-medium', selected ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300')}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Assim vai ficar o texto no PlantMap. Ajuste até ficar confortável de ler.
          </p>
        </div>
      </section>

      {saveError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Não foi possível salvar: {saveError}. Tente de novo.
        </p>
      )}
    </div>
  )
}
