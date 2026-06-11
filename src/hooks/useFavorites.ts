'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useFavorites(userId: string | null) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('favorites')
      .select('occurrence_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        setFavorites(new Set((data || []).map((f: { occurrence_id: string }) => f.occurrence_id)))
        setLoading(false)
      })
  }, [userId])

  const toggle = async (occurrenceId: string) => {
    const supabase = createClient()
    const isFav = favorites.has(occurrenceId)

    setFavorites((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(occurrenceId)
      else next.add(occurrenceId)
      return next
    })

    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', userId!).eq('occurrence_id', occurrenceId)
    } else {
      await supabase.from('favorites').insert({ user_id: userId!, occurrence_id: occurrenceId })
    }
  }

  return { favorites, loading, toggle }
}
