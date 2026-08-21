'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/** Filas de pendência publicadas no Realtime pela migration 030. */
const TABELAS = ['species', 'support_messages', 'occurrence_permission_requests'] as const

/**
 * Junta a rajada de eventos de uma mesma ação numa atualização só. Um pedido
 * de permissão, por exemplo, grava o pedido e a notificação quase juntos.
 */
const COALESCE_MS = 400

/**
 * Mantém os contadores de pendência do painel administrativo em dia quando a
 * pendência nasce do outro lado.
 *
 * As actions de revisão já invalidam o cache quando é o próprio admin que age.
 * O que faltava era o caminho inverso: médium sugere uma erva, manda uma
 * mensagem de suporte ou pede permissão, e nada avisava o navegador do admin —
 * o badge só subia no reload seguinte.
 *
 * Em vez de manter uma contagem própria no cliente, avisa o router para
 * recarregar: os contadores são calculados no layout do servidor (ver
 * app/admin/layout.tsx), então o refresh os traz certos sem duplicar aqui a
 * regra do que conta como pendente. Não há risco de laço — refresh não escreve
 * no banco, então não gera evento novo.
 */
export default function AdminRealtimeSync() {
  const router = useRouter()

  // Router numa ref e efeito sem dependências: se a identidade do router
  // mudasse a cada render, tê-lo nas dependências recriaria a assinatura em
  // loop. Assinar uma vez só é o que se quer aqui de qualquer forma.
  const routerRef = useRef(router)
  routerRef.current = router

  // O client do Supabase é singleton e `channel(topic)` reaproveita o canal
  // pelo nome — nome único por instância evita que uma segunda montagem caia
  // num canal já assinado ("cannot add postgres_changes callbacks after
  // subscribe"). Mesmo cuidado de useUnreadNotifications.
  const instanceId = useRef(Math.random().toString(36).slice(2))

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null

    const agendarAtualizacao = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => routerRef.current.refresh(), COALESCE_MS)
    }

    let channel = supabase.channel(`admin-pendencias:${instanceId.current}`)
    for (const table of TABELAS) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        agendarAtualizacao
      )
    }
    channel.subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}
