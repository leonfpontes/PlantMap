import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/actions/species', () => ({
  reviewSpecies: vi.fn(),
}))

import { reviewSpecies, SpeciesModerationItem } from '@/lib/actions/species'
import SpeciesModerationList from '@/components/admin/SpeciesModerationList'

const SPECIES: SpeciesModerationItem = {
  id: 'sp-1',
  scientific_name: 'Ocimum gratissimum',
  common_name: 'Alfavaca-cravo',
  family: 'Lamiaceae',
  origin: 'native',
  description: 'Usada em banhos de descarrego',
  image_url: null,
  status: 'pending',
  submitted_by: 'u1',
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: new Date().toISOString(),
  submitter: { full_name: 'Marina Alves', email: 'marina@example.com' },
}

beforeEach(() => {
  vi.mocked(reviewSpecies).mockReset()
})

describe('SpeciesModerationList', () => {
  it('aprova uma espécie e a remove da fila', async () => {
    vi.mocked(reviewSpecies).mockResolvedValue({ species: { ...SPECIES, status: 'approved' } })
    const user = userEvent.setup()
    render(<SpeciesModerationList initialSpecies={[SPECIES]} />)

    await user.click(screen.getByRole('button', { name: /aprovar/i }))

    expect(reviewSpecies).toHaveBeenCalledWith('sp-1', true)
    await waitFor(() => expect(screen.queryByText('Alfavaca-cravo')).not.toBeInTheDocument())
  })

  it('exige motivo antes de confirmar a rejeição', async () => {
    const user = userEvent.setup()
    render(<SpeciesModerationList initialSpecies={[SPECIES]} />)

    await user.click(screen.getByRole('button', { name: /rejeitar/i }))
    await user.click(screen.getByRole('button', { name: /confirmar rejeição/i }))

    expect(screen.getByText(/informe o motivo da rejeição/i)).toBeInTheDocument()
    expect(reviewSpecies).not.toHaveBeenCalled()
  })

  it('rejeita com o motivo informado e remove da fila', async () => {
    vi.mocked(reviewSpecies).mockResolvedValue({ species: { ...SPECIES, status: 'rejected' } })
    const user = userEvent.setup()
    render(<SpeciesModerationList initialSpecies={[SPECIES]} />)

    await user.click(screen.getByRole('button', { name: /rejeitar/i }))
    await user.type(screen.getByPlaceholderText(/motivo da rejeição/i), 'nome duplicado no catálogo')
    await user.click(screen.getByRole('button', { name: /confirmar rejeição/i }))

    expect(reviewSpecies).toHaveBeenCalledWith('sp-1', false, 'nome duplicado no catálogo')
    await waitFor(() => expect(screen.queryByText('Alfavaca-cravo')).not.toBeInTheDocument())
  })

  it('mostra o erro retornado pela action sem remover o item', async () => {
    vi.mocked(reviewSpecies).mockResolvedValue({ error: 'só admins podem revisar' })
    const user = userEvent.setup()
    render(<SpeciesModerationList initialSpecies={[SPECIES]} />)

    await user.click(screen.getByRole('button', { name: /aprovar/i }))

    expect(await screen.findByText('só admins podem revisar')).toBeInTheDocument()
    expect(screen.getByText('Alfavaca-cravo')).toBeInTheDocument()
  })
})
