'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Contador de notificações não lidas, com atualização em tempo real via
 * Supabase Realtime (migration 018 adiciona `notifications` à publicação
 * supabase_realtime) — o badge muda sozinho enquanto o app está aberto,
 * sem precisar recarregar a página.
 */
export function useUnreadNotifications(userId: string | null) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setCount(0)
      return
    }

    const supabase = createClient()
    let active = true

    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)
      if (active) setCount(count || 0)
    }

    fetchCount()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        fetchCount
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  return count
}
