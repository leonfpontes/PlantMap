'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Contador de notificações não lidas, com atualização em tempo real via
 * Supabase Realtime (migration 018 adiciona `notifications` à publicação
 * supabase_realtime) — o badge muda sozinho enquanto o app está aberto,
 * sem precisar recarregar a página.
 *
 * O client do Supabase é compartilhado (singleton) entre instâncias, e
 * `channel(topic)` reaproveita o canal existente pelo nome — como esse hook
 * roda em paralelo no Sidebar (desktop) e no BottomNav (mobile), o nome do
 * canal precisa ser único por instância, senão a segunda chamada de `.on()`
 * cai num canal que a primeira já assinou e quebra ("cannot add
 * postgres_changes callbacks ... after subscribe()").
 */
export function useUnreadNotifications(userId: string | null) {
  const [count, setCount] = useState(0)
  const instanceId = useRef(Math.random().toString(36).slice(2))

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
      .channel(`notifications:${userId}:${instanceId.current}`)
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
