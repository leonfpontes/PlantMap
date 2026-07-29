import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { registerOccurrence } from '@/lib/actions/plants'

let mockClient: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  mockClient = createSupabaseMock()
  vi.mocked(createClient).mockResolvedValue(mockClient as never)
})

const VALID_INPUT = {
  species_id: 'sp-1',
  latitude: -23.5505,
  longitude: -46.6333,
  condition: 'healthy' as const,
  stage: 'adult' as const,
}

describe('registerOccurrence', () => {
  it('bloqueia usuário não autenticado antes de tocar em qualquer tabela', async () => {
    mockClient.setUser(null)

    const result = await registerOccurrence(VALID_INPUT)

    expect(result).toEqual({ error: 'Não autenticado' })
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('bloqueia quem não tem can_register_occurrences, sem tentar inserir a ocorrência', async () => {
    mockClient.setUser({ id: 'user-1' })
    mockClient.setTableResult('profiles', { data: { can_register_occurrences: false }, error: null })

    const result = await registerOccurrence(VALID_INPUT)

    expect(result.error).toMatch(/ainda não tem permissão/)
    expect(mockClient.from).not.toHaveBeenCalledWith('occurrences')
  })

  it('insere a ocorrência com a coordenada no formato WKT correto (longitude antes de latitude)', async () => {
    mockClient.setUser({ id: 'user-1' })
    mockClient.setTableResult('profiles', { data: { can_register_occurrences: true }, error: null })
    mockClient.setTableResult('occurrences', { data: null, error: null })

    const result = await registerOccurrence(VALID_INPUT)

    expect(result).toEqual({ success: true })
    expect(mockClient.getBuilder('occurrences')?.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        species_id: 'sp-1',
        location: 'SRID=4326;POINT(-46.6333 -23.5505)',
      })
    )
  })

  it('propaga o erro do insert', async () => {
    mockClient.setUser({ id: 'user-1' })
    mockClient.setTableResult('profiles', { data: { can_register_occurrences: true }, error: null })
    mockClient.setTableResult('occurrences', { data: null, error: { message: 'espécie inexistente' } })

    const result = await registerOccurrence(VALID_INPUT)

    expect(result).toEqual({ error: 'espécie inexistente' })
  })
})
