import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getUserStats } from '@/lib/actions/profile'

let mockClient: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  mockClient = createSupabaseMock()
  vi.mocked(createClient).mockResolvedValue(mockClient as never)
})

describe('getUserStats', () => {
  it('conta ocorrências/favoritos e deduplica espécies distintas registradas', async () => {
    // getUserStats consulta `occurrences` duas vezes com propósitos diferentes
    // (contagem, depois a lista de species_id para deduplicar) — nessa ordem.
    mockClient.queueTableResult('occurrences', { data: null, error: null, count: 4 })
    mockClient.queueTableResult('occurrences', {
      error: null,
      data: [{ species_id: 'sp-1' }, { species_id: 'sp-1' }, { species_id: 'sp-2' }],
    })
    mockClient.setTableResult('favorites', { data: null, error: null, count: 7 })

    const stats = await getUserStats('user-1')

    expect(stats).toEqual({ occurrences: 4, favorites: 7, species: 2 })
  })

  it('trata contagens nulas e nenhuma ocorrência como zero', async () => {
    mockClient.queueTableResult('occurrences', { data: null, error: null, count: null })
    mockClient.queueTableResult('occurrences', { data: [], error: null })
    mockClient.setTableResult('favorites', { data: null, error: null, count: null })

    const stats = await getUserStats('user-2')

    expect(stats).toEqual({ occurrences: 0, favorites: 0, species: 0 })
  })
})
