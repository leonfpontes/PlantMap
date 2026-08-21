import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render } from '@testing-library/react'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const removeChannel = vi.fn()
const subscribe = vi.fn()
/** Callbacks registradas por tabela, para o teste poder disparar um evento. */
let handlers: Record<string, () => void>
let channelNames: string[]

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: (nome: string) => {
      channelNames.push(nome)
      const ch: Record<string, unknown> = {}
      ch.on = (_evento: string, cfg: { table: string }, cb: () => void) => {
        handlers[cfg.table] = cb
        return ch
      }
      ch.subscribe = subscribe
      return ch
    },
    removeChannel,
  }),
}))

import AdminRealtimeSync from '@/components/admin/AdminRealtimeSync'

beforeEach(() => {
  vi.useFakeTimers()
  refresh.mockReset()
  removeChannel.mockReset()
  subscribe.mockReset()
  handlers = {}
  channelNames = []
})

afterEach(() => vi.useRealTimers())

describe('AdminRealtimeSync', () => {
  it('assina as três filas de pendência', () => {
    render(<AdminRealtimeSync />)

    expect(Object.keys(handlers).sort()).toEqual([
      'occurrence_permission_requests',
      'species',
      'support_messages',
    ])
    expect(subscribe).toHaveBeenCalledTimes(1)
  })

  it('atualiza quando alguém cria uma pendência do outro lado', () => {
    render(<AdminRealtimeSync />)

    act(() => handlers.species())
    expect(refresh).not.toHaveBeenCalled() // ainda dentro da janela de agrupamento

    act(() => { vi.advanceTimersByTime(500) })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('junta uma rajada de eventos numa atualização só', () => {
    render(<AdminRealtimeSync />)

    act(() => {
      handlers.occurrence_permission_requests()
      handlers.support_messages()
      handlers.species()
    })
    act(() => { vi.advanceTimersByTime(500) })

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('desfaz a assinatura e não atualiza depois de desmontar', () => {
    const { unmount } = render(<AdminRealtimeSync />)

    act(() => handlers.support_messages())
    unmount()
    act(() => { vi.advanceTimersByTime(500) })

    expect(removeChannel).toHaveBeenCalledTimes(1)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('usa nome de canal único por instância, pra duas montagens não colidirem', () => {
    render(<AdminRealtimeSync />)
    render(<AdminRealtimeSync />)

    expect(channelNames).toHaveLength(2)
    expect(channelNames[0]).not.toBe(channelNames[1])
  })
})
