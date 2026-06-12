'use client'

import { useState, useEffect } from 'react'
import { searchSpecies } from '@/lib/actions/plants'
import type { Species } from '@/types'

/**
 * Busca espécies com debounce de 300 ms.
 *
 * @param query - Texto digitado pelo usuário.
 * @returns Lista de espécies encontradas e indicador de carregamento.
 *
 * @example
 * const { results, loading } = useSpeciesSearch(query)
 */
export function useSpeciesSearch(query: string) {
  const [results, setResults]   = useState<Species[]>([])
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      const data = await searchSpecies(query)
      setResults(data)
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return { results, loading }
}
