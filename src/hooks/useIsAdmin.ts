'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Verifica se o usuário atual tem a flag `is_admin` em `profiles`.
 * Reflete no client a mesma regra usada pelas policies de RLS
 * (dono do registro OU admin pode editar/excluir ocorrências de terceiros).
 */
export function useIsAdmin(userId: string | null) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setIsAdmin(!!data?.is_admin)
        setLoading(false)
      })
  }, [userId])

  return { isAdmin, loading }
}
