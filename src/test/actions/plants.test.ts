import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { registerOccurrence, searchSpecies, getOccurrence } from '@/lib/actions/plants'

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

describe('searchSpecies', () => {
  it('vai pela RPC search_species, que normaliza acentos nos dois lados (migration 025)', async () => {
    mockClient.setRpcResult('search_species', {
      data: [{ id: 'sp-1', common_name: 'Guiné' }],
      error: null,
    })

    const result = await searchSpecies('guine')

    expect(mockClient.getRpcCalls()).toEqual([
      { fn: 'search_species', params: { p_query: 'guine', p_limit: 20 } },
    ])
    expect(result).toEqual([{ id: 'sp-1', common_name: 'Guiné' }])
    // O termo vai como parâmetro, sem montar filtro na tabela.
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('repassa o termo cru (acentuado ou com parênteses) sem quebrar a query', async () => {
    mockClient.setRpcResult('search_species', { data: [], error: null })

    await searchSpecies('erva (guiné)')

    expect(mockClient.getRpcCalls()).toEqual([
      { fn: 'search_species', params: { p_query: 'erva (guiné)', p_limit: 20 } },
    ])
  })

  it('devolve lista vazia quando a RPC não retorna nada', async () => {
    mockClient.setRpcResult('search_species', { data: null, error: null })

    expect(await searchSpecies('xyz')).toEqual([])
  })
})

describe('getOccurrence', () => {
  const DETAIL = {
    id: 'occ-1',
    user_id: 'user-1',
    species_id: 'sp-1',
    latitude: -21.1767,
    longitude: -47.8208,
    condition: 'healthy',
    stage: 'adult',
    notes: null,
    photo_url: null,
    verified: false,
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    updated_by: null,
  }

  it('credita quem registrou, com o tier derivado dos pontos, enquanto ninguém editou', async () => {
    mockClient.setRpcResult('get_occurrence_detail', { data: DETAIL, error: null })
    mockClient.setTableResult('species', { data: { id: 'sp-1', common_name: 'Guiné' }, error: null })
    mockClient.setTableResult('profiles', {
      data: {
        id: 'user-1',
        full_name: 'Maria da Mata',
        avatar_url: 'https://lh3.googleusercontent.com/foto',
        points: 120,
        deleted_at: null,
      },
      error: null,
    })

    const occurrence = await getOccurrence('occ-1')

    expect(occurrence?.credit).toEqual({
      id: 'user-1',
      full_name: 'Maria da Mata',
      avatar_url: 'https://lh3.googleusercontent.com/foto',
      points: 120,
      tier: 'raiz',
      deleted: false,
      kind: 'registered',
      at: DETAIL.created_at,
    })
  })

  it('credita quem editou, não quem registrou, quando a edição foi de outra pessoa', async () => {
    mockClient.setRpcResult('get_occurrence_detail', {
      data: { ...DETAIL, updated_by: 'admin-1', updated_at: '2026-08-15T09:30:00Z' },
      error: null,
    })
    mockClient.setTableResult('species', { data: { id: 'sp-1' }, error: null })
    mockClient.setTableResult('profiles', {
      data: { id: 'admin-1', full_name: 'João Guardião', avatar_url: null, points: 300, deleted_at: null },
      error: null,
    })

    const occurrence = await getOccurrence('occ-1')

    expect(occurrence?.credit).toMatchObject({
      id: 'admin-1',
      full_name: 'João Guardião',
      tier: 'guardiao',
      kind: 'updated',
      at: '2026-08-15T09:30:00Z',
    })
  })

  it('mantém o crédito de registro quando o próprio dono editou a planta dele', async () => {
    mockClient.setRpcResult('get_occurrence_detail', {
      data: { ...DETAIL, updated_by: DETAIL.user_id, updated_at: '2026-08-15T09:30:00Z' },
      error: null,
    })
    mockClient.setTableResult('species', { data: { id: 'sp-1' }, error: null })
    mockClient.setTableResult('profiles', {
      data: { id: 'user-1', full_name: 'Maria da Mata', avatar_url: null, points: 120, deleted_at: null },
      error: null,
    })

    const occurrence = await getOccurrence('occ-1')

    // Mesma pessoa dos dois lados: trocar o rótulo para "Atualizado por" só
    // confundiria, então segue como registro — com a data do registro.
    expect(occurrence?.credit).toMatchObject({
      id: 'user-1',
      kind: 'registered',
      at: DETAIL.created_at,
    })
  })

  it('busca o perfil de quem editou, e não o do dono do registro', async () => {
    mockClient.setRpcResult('get_occurrence_detail', {
      data: { ...DETAIL, updated_by: 'admin-1' },
      error: null,
    })
    mockClient.setTableResult('species', { data: { id: 'sp-1' }, error: null })
    mockClient.setTableResult('profiles', { data: { id: 'admin-1', points: 0 }, error: null })

    await getOccurrence('occ-1')

    expect(mockClient.getBuilder('profiles')?.eq).toHaveBeenCalledWith('id', 'admin-1')
  })

  it('marca conta excluída, que vem anonimizada do banco (migration 019)', async () => {
    mockClient.setRpcResult('get_occurrence_detail', { data: DETAIL, error: null })
    mockClient.setTableResult('species', { data: { id: 'sp-1' }, error: null })
    mockClient.setTableResult('profiles', {
      data: { id: 'user-1', full_name: null, avatar_url: null, points: 0, deleted_at: '2026-08-10T00:00:00Z' },
      error: null,
    })

    const occurrence = await getOccurrence('occ-1')

    expect(occurrence?.credit).toMatchObject({ deleted: true, tier: 'sementeira' })
  })

  it('não quebra a tela quando o perfil da pessoa creditada não vem', async () => {
    mockClient.setRpcResult('get_occurrence_detail', { data: DETAIL, error: null })
    mockClient.setTableResult('species', { data: { id: 'sp-1' }, error: null })
    mockClient.setTableResult('profiles', { data: null, error: null })

    const occurrence = await getOccurrence('occ-1')

    expect(occurrence?.id).toBe('occ-1')
    expect(occurrence?.credit).toBeUndefined()
  })
})
