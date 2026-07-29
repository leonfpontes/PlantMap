import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/actions/permissions', () => ({
  reviewPermissionRequest: vi.fn(),
  setRegistrationPermission: vi.fn(),
}))

import { reviewPermissionRequest, setRegistrationPermission } from '@/lib/actions/permissions'
import AdminUsersList from '@/components/admin/AdminUsersList'
import { AdminUserRow } from '@/types'

const PENDING_USER: AdminUserRow = {
  id: 'u1',
  email: 'marina@example.com',
  full_name: 'Marina Alves',
  avatar_url: null,
  is_admin: false,
  can_register_occurrences: false,
  created_at: new Date().toISOString(),
  latest_request: {
    id: 'r1',
    user_id: 'u1',
    message: 'Sou médium do terreiro',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: new Date().toISOString(),
  },
}

const GRANTED_USER: AdminUserRow = {
  id: 'u2',
  email: 'joao@example.com',
  full_name: 'João Pedro',
  avatar_url: null,
  is_admin: false,
  can_register_occurrences: true,
  created_at: new Date().toISOString(),
  latest_request: null,
}

beforeEach(() => {
  vi.mocked(reviewPermissionRequest).mockReset()
  vi.mocked(setRegistrationPermission).mockReset()
})

describe('AdminUsersList', () => {
  it('aprova um pedido pendente e concede a permissão', async () => {
    vi.mocked(reviewPermissionRequest).mockResolvedValue({})
    const user = userEvent.setup()
    render(<AdminUsersList initialUsers={[PENDING_USER]} />)

    await user.click(screen.getByRole('button', { name: /aprovar/i }))

    expect(reviewPermissionRequest).toHaveBeenCalledWith('r1', true)
    await waitFor(() => expect(screen.getByText('Pode registrar')).toBeInTheDocument())
    expect(screen.queryByText('Pedido em análise')).not.toBeInTheDocument()
  })

  it('exige motivo antes de confirmar a rejeição de um pedido', async () => {
    const user = userEvent.setup()
    render(<AdminUsersList initialUsers={[PENDING_USER]} />)

    await user.click(screen.getByRole('button', { name: /rejeitar/i }))
    await user.click(screen.getByRole('button', { name: /confirmar rejeição/i }))

    expect(screen.getByText(/informe o motivo da rejeição/i)).toBeInTheDocument()
    expect(reviewPermissionRequest).not.toHaveBeenCalled()
  })

  it('revoga a permissão de quem já pode registrar, sem passar por pedido', async () => {
    vi.mocked(setRegistrationPermission).mockResolvedValue({})
    const user = userEvent.setup()
    render(<AdminUsersList initialUsers={[GRANTED_USER]} />)

    await user.click(screen.getByRole('button', { name: /revogar permissão/i }))

    expect(setRegistrationPermission).toHaveBeenCalledWith('u2', false)
    await waitFor(() => expect(screen.getByRole('button', { name: /conceder permissão/i })).toBeInTheDocument())
  })
})
