import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getLeaderboard, getMyRankingSummary } from '@/lib/actions/ranking'

let mockClient: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  mockClient = createSupabaseMock()
  vi.mocked(createClient).mockResolvedValue(mockClient as never)
})

describe('getLeaderboard', () => {
  it('ordena por pontos e mapeia pra LeaderboardEntry com rank e tier', async () => {
    mockClient.setTableResult('profiles', {
      data: [
        { id: 'u1', full_name: 'Ana', avatar_url: null, points: 300 },
        { id: 'u2', full_name: 'Beto', avatar_url: null, points: 10 },
      ],
      error: null,
    })

    const result = await getLeaderboard()

    expect(result).toEqual([
      { id: 'u1', full_name: 'Ana', avatar_url: null, points: 300, tier: 'guardiao', rank: 1 },
      { id: 'u2', full_name: 'Beto', avatar_url: null, points: 10, tier: 'sementeira', rank: 2 },
    ])
  })

  it('filtra perfis excluídos e ordena por pontos desc', async () => {
    mockClient.setTableResult('profiles', { data: [], error: null })

    await getLeaderboard(10)

    const builder = mockClient.getBuilder('profiles')
    expect(builder?.is).toHaveBeenCalledWith('deleted_at', null)
    expect(builder?.order).toHaveBeenCalledWith('points', { ascending: false })
    expect(builder?.limit).toHaveBeenCalledWith(10)
  })
})

describe('getMyRankingSummary', () => {
  it('calcula a posição contando perfis com mais pontos', async () => {
    mockClient.queueTableResult('profiles', { data: { points: 40 }, error: null })
    mockClient.queueTableResult('profiles', { data: null, error: null, count: 3 })

    const result = await getMyRankingSummary('u1')

    expect(result).toEqual({ points: 40, tier: 'broto', rank: 4 })
  })

  it('retorna null quando o perfil não existe', async () => {
    mockClient.queueTableResult('profiles', { data: null, error: null })

    const result = await getMyRankingSummary('unknown')

    expect(result).toBeNull()
  })
})
