'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Leaf, Sparkles } from 'lucide-react'
import { compressPhoto } from '@/lib/image'
import type { IdentifySuggestion } from '@/lib/plantId'
import type { Species } from '@/types'
import { cn } from '@/lib/utils'

interface PlantIdSuggestionsProps {
  /** Foto escolhida no cadastro; a cada foto nova, identifica de novo. */
  file: File | null
  selectedId: string | null
  onSelect: (species: Species) => void
}

/**
 * "Parece ser...": sugere a espécie pela foto, via Pl@ntNet (rota
 * /api/identify, que roda no servidor). Opcional: só roda quando a pessoa
 * toca em "Identificar pela foto" — quem já sabe a erva segue direto, e a
 * cota diária do Pl@ntNet não é gasta à toa. Só sugestões que existem no
 * catálogo podem ser tocadas; as outras aparecem como pista.
 */
export default function PlantIdSuggestions({ file, selectedId, onSelect }: PlantIdSuggestionsProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [suggestions, setSuggestions] = useState<IdentifySuggestion[]>([])
  const [message, setMessage] = useState<string | null>(null)
  // Foto que a pessoa pediu para identificar; trocar a foto volta ao botão.
  const [requested, setRequested] = useState<File | null>(null)

  useEffect(() => {
    if (!file || requested !== file) {
      setState('idle')
      setSuggestions([])
      return
    }
    let cancelado = false
    setState('loading')
    setMessage(null)

    ;(async () => {
      try {
        const foto = await compressPhoto(file)
        const body = new FormData()
        body.append('image', foto, foto.name)
        const res = await fetch('/api/identify', { method: 'POST', body })
        const data = (await res.json()) as { suggestions?: IdentifySuggestion[]; error?: string }
        if (cancelado) return
        if (!res.ok) {
          setState('error')
          setMessage(data.error ?? 'Não foi possível identificar. Escolha a espécie na lista.')
          return
        }
        setSuggestions(data.suggestions ?? [])
        setState('done')
      } catch {
        if (cancelado) return
        setState('error')
        setMessage('Sem conexão para identificar. Escolha a espécie na lista.')
      }
    })()

    return () => { cancelado = true }
  }, [file, requested])

  if (!file) return null

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setRequested(file)}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/40"
      >
        <Sparkles className="h-4 w-4" />
        Não sabe qual é? Identificar pela foto
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-green-100 bg-green-50/60 p-3 dark:border-green-900 dark:bg-green-950/30">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-300">
        <Sparkles className="h-3.5 w-3.5" />
        {state === 'loading' ? 'Identificando pela foto...' : 'Parece ser'}
      </p>

      {state === 'loading' && (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-green-100/70 dark:bg-green-900/40" />)}
        </div>
      )}

      {state === 'error' && <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>}

      {state === 'done' && suggestions.length === 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Não reconhecemos a planta nesta foto. Tente uma foto mais perto da folha ou da flor, ou escolha na lista.
        </p>
      )}

      {state === 'done' && suggestions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => {
            const pct = Math.round(s.score * 100)
            if (!s.species) {
              return (
                <li key={s.scientificName} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <Leaf className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1">
                    <span className="italic">{s.scientificName}</span>
                    {s.commonNames[0] && <span> ({s.commonNames[0]})</span>}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Fora do catálogo · {pct}%</span>
                  </span>
                </li>
              )
            }
            const escolhida = selectedId === s.species.id
            return (
              <li key={s.scientificName}>
                <button
                  type="button"
                  onClick={() => onSelect(s.species as Species)}
                  aria-pressed={escolhida}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-lg border bg-white px-2 py-1.5 text-left transition-colors dark:bg-gray-900',
                    escolhida
                      ? 'border-green-700 ring-1 ring-green-700 dark:border-green-500 dark:ring-green-500'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-green-100 dark:bg-green-900/40">
                    {s.species.image_url ? (
                      <Image src={s.species.image_url} alt="" fill sizes="36px" className="object-cover" />
                    ) : (
                      <Leaf className="m-2 h-5 w-5 text-green-600" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{s.species.common_name}</span>
                    <span className="block truncate text-xs italic text-gray-500 dark:text-gray-400">{s.scientificName}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs font-semibold text-green-700 dark:text-green-400">
                    {escolhida ? 'Escolhida' : `${pct}%`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {state === 'done' && (
        <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">Sugestão do Pl@ntNet. Confira antes de salvar.</p>
      )}
    </div>
  )
}
