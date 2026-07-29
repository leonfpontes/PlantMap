import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/actions/plants', () => ({
  searchSpecies: vi.fn(),
}))

import { searchSpecies } from '@/lib/actions/plants'
import SpeciesCombobox from '@/components/plant/SpeciesCombobox'
import { Species } from '@/types'

const SPECIES: Species = {
  id: 'sp-1',
  scientific_name: 'Ocimum gratissimum',
  common_name: 'Alfavaca-cravo',
  family: 'Lamiaceae',
  origin: 'native',
  description: null,
  image_url: null,
  status: 'approved',
  submitted_by: null,
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: new Date().toISOString(),
} as Species

describe('SpeciesCombobox', () => {
  it('fecha o dropdown depois de selecionar uma espécie', async () => {
    vi.mocked(searchSpecies).mockResolvedValue([SPECIES])
    const user = userEvent.setup()
    render(<SpeciesCombobox selected={null} onSelect={vi.fn()} />)

    await user.type(screen.getByPlaceholderText(/buscar por nome comum/i), 'Alfavaca')

    const option = await screen.findByText('Alfavaca-cravo')
    await user.click(option)

    await waitFor(() => {
      expect(screen.queryByText('Alfavaca-cravo', { selector: 'button *' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /não encontrou/i })).not.toBeInTheDocument()
  })
})
