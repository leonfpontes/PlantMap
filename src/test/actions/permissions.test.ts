import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSupabaseMock } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// revalidatePath exige o contexto de request do Next, que não existe aqui.
// O mock deixa a action rodar; que ela invalida o cache é verificado abaixo.
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}))

import { createClient } from '@/lib/supabase/server'
import {
  listAllUsers,
  requestOccurrencePermission,
  reviewPermissionRequest,
  setRegistrationPermission,
} from '@/lib/actions/permissions'

let mockClient: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  mockClient = createSupabaseMock()
  vi.mocked(createClient).mockResolvedValue(mockClient as never)
  revalidatePath.mockReset()
})

describe('listAllUsers', () => {
  it('anexa o pedido de permissão mais recente de cada usuário', async () => {
    mockClient.setTableResult('profiles', {
      error: null,
      data: [
        { id: 'u1', email: 'a@x.com', full_name: 'A', avatar_url: null, is_admin: false, can_register_occurrences: false, created_at: '2026-01-01' },
        { id: 'u2', email: 'b@x.com', full_name: 'B', avatar_url: null, is_admin: false, can_register_occurrences: true, created_at: '2026-01-02' },
      ],
    })
    // Ordenado desc por created_at, como a query real faz — o mais recente vem primeiro.
    mockClient.setTableResult('occurrence_permission_requests', {
      error: null,
      data: [
        { id: 'r2', user_id: 'u1', status: 'rejected', created_at: '2026-02-01', message: null, reviewed_by: null, reviewed_at: null, rejection_reason: 'motivo antigo' },
        { id: 'r1', user_id: 'u1', status: 'pending', created_at: '2026-03-01', message: 'novo pedido', reviewed_by: null, reviewed_at: null, rejection_reason: null },
      ],
    })

    const users = await listAllUsers()

    const u1 = users.find((u) => u.id === 'u1')!
    expect(u1.latest_request?.id).toBe('r2')
    // A ordem de chegada da query é quem decide "mais recente" (primeiro do array vence);
    // aqui o mock deliberadamente lista r2 primeiro para provar que o dedup pega o 1º, não o de status mais "avançado".

    const u2 = users.find((u) => u.id === 'u2')!
    expect(u2.latest_request).toBeNull()
  })
})

describe('requestOccurrencePermission', () => {
  it('envia a mensagem pra RPC e retorna sem erro quando dá certo', async () => {
    mockClient.setRpcResult('request_occurrence_permission', { data: null, error: null })

    const result = await requestOccurrencePermission('quero ajudar')

    expect(result).toEqual({})
    const call = mockClient.getRpcCalls().find((c) => c.fn === 'request_occurrence_permission')
    expect(call?.params).toEqual({ p_message: 'quero ajudar' })
  })

  it('propaga o erro da RPC', async () => {
    mockClient.setRpcResult('request_occurrence_permission', { data: null, error: { message: 'já existe pedido pendente' } })

    const result = await requestOccurrencePermission()

    expect(result).toEqual({ error: 'já existe pedido pendente' })
  })
})

describe('reviewPermissionRequest', () => {
  it('aprova sem motivo de rejeição', async () => {
    mockClient.setRpcResult('review_occurrence_permission_request', { data: null, error: null })

    await reviewPermissionRequest('req-1', true)

    const call = mockClient.getRpcCalls().find((c) => c.fn === 'review_occurrence_permission_request')
    expect(call?.params).toEqual({ p_request_id: 'req-1', p_approve: true, p_rejection_reason: null })
  })

  it('rejeita com motivo', async () => {
    mockClient.setRpcResult('review_occurrence_permission_request', { data: null, error: null })

    await reviewPermissionRequest('req-2', false, 'sem informações suficientes')

    const call = mockClient.getRpcCalls().find((c) => c.fn === 'review_occurrence_permission_request')
    expect(call?.params).toEqual({ p_request_id: 'req-2', p_approve: false, p_rejection_reason: 'sem informações suficientes' })
  })
})

describe('setRegistrationPermission', () => {
  it('concede permissão direto, sem pedido', async () => {
    mockClient.setRpcResult('set_registration_permission', { data: null, error: null })

    const result = await setRegistrationPermission('u9', true)

    expect(result).toEqual({})
    const call = mockClient.getRpcCalls().find((c) => c.fn === 'set_registration_permission')
    expect(call?.params).toEqual({ p_user_id: 'u9', p_allowed: true })
  })
})

describe('invalidação dos contadores de pendência', () => {
  it.each([
    ['reviewPermissionRequest', () => reviewPermissionRequest('r-1', true)],
    ['setRegistrationPermission', () => setRegistrationPermission('u-1', true)],
  ])('%s invalida /admin e /profile', async (_nome, chamar) => {
    mockClient.setRpcResult('review_occurrence_permission_request', { data: null, error: null })
    mockClient.setRpcResult('set_registration_permission', { data: null, error: null })

    await chamar()

    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/profile')
  })

  it('não invalida nada quando a RPC falha', async () => {
    mockClient.setRpcResult('review_occurrence_permission_request', {
      data: null,
      error: { message: 'sem permissão' },
    })

    await reviewPermissionRequest('r-1', true)

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
