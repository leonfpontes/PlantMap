import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/actions/support', () => ({
  resolveSupportMessage: vi.fn(),
}))

// Os componentes dão router.refresh() depois de agir, pra recalcular o que é
// renderizado no servidor (badges do menu admin, fila de /admin).
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))


import { resolveSupportMessage } from '@/lib/actions/support'
import SupportInbox from '@/components/admin/SupportInbox'
import { SupportMessage } from '@/types'

const OPEN_MESSAGE: SupportMessage = {
  id: 'm-1',
  user_id: 'u1',
  subject: 'Não consigo enviar foto',
  message: 'O upload trava na metade.',
  status: 'open',
  admin_reply: null,
  resolved_by: null,
  resolved_at: null,
  created_at: new Date().toISOString(),
}

beforeEach(() => {
  vi.mocked(resolveSupportMessage).mockReset()
  refresh.mockReset()
})

describe('SupportInbox', () => {
  it('resolve sem resposta quando o textarea fica em branco', async () => {
    vi.mocked(resolveSupportMessage).mockResolvedValue({})
    const user = userEvent.setup()
    render(<SupportInbox initialMessages={[OPEN_MESSAGE]} />)

    await user.click(screen.getByRole('button', { name: /marcar como resolvida/i }))

    expect(resolveSupportMessage).toHaveBeenCalledWith('m-1', undefined)
    await waitFor(() => expect(screen.getByText(/resolvidas \(1\)/i)).toBeInTheDocument())
  })

  it('resolve com a resposta digitada e move a mensagem para "Resolvidas"', async () => {
    vi.mocked(resolveSupportMessage).mockResolvedValue({})
    const user = userEvent.setup()
    render(<SupportInbox initialMessages={[OPEN_MESSAGE]} />)

    await user.type(screen.getByPlaceholderText(/resposta \(opcional\)/i), 'Já corrigimos, tente de novo!')
    await user.click(screen.getByRole('button', { name: /marcar como resolvida/i }))

    expect(resolveSupportMessage).toHaveBeenCalledWith('m-1', 'Já corrigimos, tente de novo!')
    await waitFor(() => expect(screen.getByText('Já corrigimos, tente de novo!')).toBeInTheDocument())
    expect(screen.queryByText(/abertas \(1\)/i)).not.toBeInTheDocument()
  })

  it('atualiza os contadores do servidor ao resolver, sem exigir reload', async () => {
    vi.mocked(resolveSupportMessage).mockResolvedValue({})
    const user = userEvent.setup()
    render(<SupportInbox initialMessages={[OPEN_MESSAGE]} />)

    await user.click(screen.getByRole('button', { name: /marcar como resolvida/i }))

    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('não atualiza os contadores quando a action falha', async () => {
    vi.mocked(resolveSupportMessage).mockResolvedValue({ error: 'sem permissão' })
    const user = userEvent.setup()
    render(<SupportInbox initialMessages={[OPEN_MESSAGE]} />)

    await user.click(screen.getByRole('button', { name: /marcar como resolvida/i }))

    expect(await screen.findByText('sem permissão')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('mostra o erro da action e mantém a mensagem em aberto', async () => {
    vi.mocked(resolveSupportMessage).mockResolvedValue({ error: 'sem permissão' })
    const user = userEvent.setup()
    render(<SupportInbox initialMessages={[OPEN_MESSAGE]} />)

    await user.click(screen.getByRole('button', { name: /marcar como resolvida/i }))

    expect(await screen.findByText('sem permissão')).toBeInTheDocument()
    expect(screen.getByText(/abertas \(1\)/i)).toBeInTheDocument()
  })
})
