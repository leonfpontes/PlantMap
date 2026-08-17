import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import {
  createSpeciesAdmin,
  updateSpeciesAdmin,
  deleteSpeciesAdmin,
  listAllSpeciesAdmin,
  listApprovedSpeciesCatalog,
} from '@/lib/actions/species'

let mockClient: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  mockClient = createSupabaseMock()
  vi.mocked(createClient).mockResolvedValue(mockClient as never)
})

const FORM_DATA = {
  common_name: 'Guiné',
  scientific_name: 'Petiveria alliacea',
  family: 'Phytolaccaceae',
  origin: 'native' as const,
  description: 'Usada em banhos de descarrego',
  image_url: 'https://example.com/guine.jpg',
}

describe('createSpeciesAdmin', () => {
  it('chama a RPC create_species_admin com os campos do formulário', async () => {
    mockClient.setRpcResult('create_species_admin', {
      data: { id: 'sp-1', ...FORM_DATA, status: 'approved' },
      error: null,
    })

    const result = await createSpeciesAdmin(FORM_DATA)

    expect(mockClient.getRpcCalls()).toEqual([
      {
        fn: 'create_species_admin',
        params: {
          p_common_name: FORM_DATA.common_name,
          p_scientific_name: FORM_DATA.scientific_name,
          p_family: FORM_DATA.family,
          p_origin: FORM_DATA.origin,
          p_description: FORM_DATA.description,
          p_image_url: FORM_DATA.image_url,
        },
      },
    ])
    expect(result.species).toMatchObject({ id: 'sp-1', status: 'approved' })
  })

  it('repassa o erro da RPC (ex.: quem chama não é admin)', async () => {
    mockClient.setRpcResult('create_species_admin', {
      data: null,
      error: { message: 'Apenas administradores podem cadastrar espécies diretamente' },
    })

    const result = await createSpeciesAdmin(FORM_DATA)

    expect(result).toEqual({ error: 'Apenas administradores podem cadastrar espécies diretamente' })
  })
})

describe('updateSpeciesAdmin', () => {
  it('chama a RPC update_species_admin com o id e os campos editados', async () => {
    mockClient.setRpcResult('update_species_admin', {
      data: { id: 'sp-1', ...FORM_DATA, common_name: 'Guiné-branca', status: 'approved' },
      error: null,
    })

    const result = await updateSpeciesAdmin('sp-1', { ...FORM_DATA, common_name: 'Guiné-branca' })

    expect(mockClient.getRpcCalls()).toEqual([
      {
        fn: 'update_species_admin',
        params: expect.objectContaining({ p_species_id: 'sp-1', p_common_name: 'Guiné-branca' }),
      },
    ])
    expect(result.species?.common_name).toBe('Guiné-branca')
  })
})

describe('deleteSpeciesAdmin', () => {
  it('chama a RPC delete_species_admin com o id da espécie', async () => {
    mockClient.setRpcResult('delete_species_admin', { data: null, error: null })

    const result = await deleteSpeciesAdmin('sp-1')

    expect(mockClient.getRpcCalls()).toEqual([
      { fn: 'delete_species_admin', params: { p_species_id: 'sp-1' } },
    ])
    expect(result).toEqual({})
  })

  it('repassa o erro quando há ocorrências dependentes', async () => {
    mockClient.setRpcResult('delete_species_admin', {
      data: null,
      error: { message: 'Não é possível excluir: 2 ocorrência(s) registrada(s) usam esta espécie' },
    })

    const result = await deleteSpeciesAdmin('sp-1')

    expect(result.error).toMatch(/ocorrência/)
  })
})

describe('listAllSpeciesAdmin', () => {
  it('busca todas as espécies sem filtrar por status', async () => {
    mockClient.setTableResult('species', {
      data: [{ id: 'sp-1', status: 'pending' }, { id: 'sp-2', status: 'approved' }],
      error: null,
    })

    const result = await listAllSpeciesAdmin()

    expect(result).toHaveLength(2)
    expect(mockClient.getBuilder('species')?.or).not.toHaveBeenCalled()
  })

  it('aplica o filtro de busca quando a query tem 2+ caracteres', async () => {
    mockClient.setTableResult('species', { data: [], error: null })

    await listAllSpeciesAdmin('gu')

    expect(mockClient.getBuilder('species')?.or).toHaveBeenCalledWith(
      'common_name_normalized.ilike.%gu%,scientific_name_normalized.ilike.%gu%'
    )
  })

  it('busca nas colunas normalizadas com o termo sem acento (migration 025)', async () => {
    mockClient.setTableResult('species', { data: [], error: null })

    await listAllSpeciesAdmin('Guiné')

    expect(mockClient.getBuilder('species')?.or).toHaveBeenCalledWith(
      'common_name_normalized.ilike.%guine%,scientific_name_normalized.ilike.%guine%'
    )
  })

  it('neutraliza metacaracteres do PostgREST no termo digitado', async () => {
    mockClient.setTableResult('species', { data: [], error: null })

    await listAllSpeciesAdmin('erva (guiné)')

    expect(mockClient.getBuilder('species')?.or).toHaveBeenCalledWith(
      'common_name_normalized.ilike.%erva  guine %,scientific_name_normalized.ilike.%erva  guine %'
    )
  })
})

describe('listApprovedSpeciesCatalog', () => {
  it('filtra pelas colunas normalizadas, ignorando acentuação', async () => {
    mockClient.setTableResult('species', { data: [], error: null })

    await listApprovedSpeciesCatalog('AÇAFRÃO')

    expect(mockClient.getBuilder('species')?.or).toHaveBeenCalledWith(
      'common_name_normalized.ilike.%acafrao%,scientific_name_normalized.ilike.%acafrao%'
    )
  })

  it('não filtra por nome quando a query tem menos de 2 caracteres', async () => {
    mockClient.setTableResult('species', { data: [], error: null })

    await listApprovedSpeciesCatalog('a')

    expect(mockClient.getBuilder('species')?.or).not.toHaveBeenCalled()
  })
})
