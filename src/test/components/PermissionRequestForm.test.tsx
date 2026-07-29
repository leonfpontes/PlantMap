import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/actions/permissions', () => ({
  requestOccurrencePermission: vi.fn(),
}))

import { requestOccurrencePermission } from '@/lib/actions/permissions'
import PermissionRequestForm from '@/components/profile/PermissionRequestForm'

beforeEach(() => {
  vi.mocked(requestOccurrencePermission).mockReset()
})

describe('PermissionRequestForm', () => {
  it('quem já pode registrar só vê a confirmação, sem formulário', () => {
    render(<PermissionRequestForm canRegister initialRequests={[]} />)

    expect(screen.getByText(/você já pode registrar novas ocorrências/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pedir permissão/i })).not.toBeInTheDocument()
  })

  it('envia o pedido e mostra o status "em análise" sem precisar recarregar', async () => {
    vi.mocked(requestOccurrencePermission).mockResolvedValue({})
    const user = userEvent.setup()
    render(<PermissionRequestForm canRegister={false} initialRequests={[]} />)

    await user.type(screen.getByPlaceholderText(/sou médium do terreiro/i), 'quero ajudar a mapear')
    await user.click(screen.getByRole('button', { name: /pedir permissão para registrar/i }))

    expect(requestOccurrencePermission).toHaveBeenCalledWith('quero ajudar a mapear')
    await waitFor(() => expect(screen.getByText(/seu pedido está em análise/i)).toBeInTheDocument())
  })

  it('com um pedido já pendente, esconde o formulário e mostra só o status', () => {
    render(
      <PermissionRequestForm
        canRegister={false}
        initialRequests={[{
          id: 'r1',
          user_id: 'u1',
          message: null,
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          created_at: new Date().toISOString(),
        }]}
      />
    )

    expect(screen.getByText(/seu pedido está em análise/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pedir permissão/i })).not.toBeInTheDocument()
  })

  it('mostra o erro da action quando o pedido falha', async () => {
    vi.mocked(requestOccurrencePermission).mockResolvedValue({ error: 'já existe um pedido pendente' })
    const user = userEvent.setup()
    render(<PermissionRequestForm canRegister={false} initialRequests={[]} />)

    await user.click(screen.getByRole('button', { name: /pedir permissão para registrar/i }))

    expect(await screen.findByText('já existe um pedido pendente')).toBeInTheDocument()
  })
})
