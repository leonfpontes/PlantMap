import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/actions/species', () => ({
  listAllSpeciesAdmin: vi.fn(),
  deleteSpeciesAdmin: vi.fn(),
  createSpeciesAdmin: vi.fn(),
  updateSpeciesAdmin: vi.fn(),
}))

import {
  listAllSpeciesAdmin,
  deleteSpeciesAdmin,
  createSpeciesAdmin,
  updateSpeciesAdmin,
} from '@/lib/actions/species'
import SpeciesCatalogManager from '@/components/admin/SpeciesCatalogManager'
import { Species } from '@/types'

function makeSpecies(overrides: Partial<Species> = {}): Species {
  return {
    id: 'sp-1',
    scientific_name: 'Ocimum gratissimum',
    common_name: 'Alfavaca-cravo',
    family: 'Lamiaceae',
    origin: 'native',
    description: null,
    image_url: null,
    status: 'approved',
    submitted_by: null,
    reviewed_by: 'admin-1',
    reviewed_at: new Date().toISOString(),
    rejection_reason: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(listAllSpeciesAdmin).mockReset()
  vi.mocked(deleteSpeciesAdmin).mockReset()
  vi.mocked(createSpeciesAdmin).mockReset()
  vi.mocked(updateSpeciesAdmin).mockReset()
})

describe('SpeciesCatalogManager', () => {
  it('mostra a lista inicial com o status de cada espécie', () => {
    render(<SpeciesCatalogManager initialSpecies={[makeSpecies({ status: 'pending' })]} />)

    expect(screen.getByText('Alfavaca-cravo')).toBeInTheDocument()
    expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument()
  })

  it('busca ao digitar e substitui a lista pelo resultado', async () => {
    vi.mocked(listAllSpeciesAdmin).mockResolvedValue([makeSpecies({ id: 'sp-2', common_name: 'Guiné' })])
    const user = userEvent.setup()
    render(<SpeciesCatalogManager initialSpecies={[makeSpecies()]} />)

    await user.type(screen.getByPlaceholderText(/buscar espécie/i), 'gu')

    expect(listAllSpeciesAdmin).toHaveBeenCalledWith('gu')
    await waitFor(() => expect(screen.getByText('Guiné')).toBeInTheDocument())
    expect(screen.queryByText('Alfavaca-cravo')).not.toBeInTheDocument()
  })

  it('exige confirmação antes de excluir e remove da lista ao confirmar', async () => {
    vi.mocked(deleteSpeciesAdmin).mockResolvedValue({})
    const user = userEvent.setup()
    render(<SpeciesCatalogManager initialSpecies={[makeSpecies()]} />)

    await user.click(screen.getByRole('button', { name: /excluir alfavaca-cravo/i }))
    expect(screen.getByText(/excluir definitivamente/i)).toBeInTheDocument()
    expect(deleteSpeciesAdmin).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^excluir$/i }))

    expect(deleteSpeciesAdmin).toHaveBeenCalledWith('sp-1')
    await waitFor(() => expect(screen.queryByText('Alfavaca-cravo')).not.toBeInTheDocument())
  })

  it('mostra o erro da action de exclusão sem remover o item (ex.: ocorrências dependentes)', async () => {
    vi.mocked(deleteSpeciesAdmin).mockResolvedValue({ error: 'Não é possível excluir: 2 ocorrência(s) usam esta espécie' })
    const user = userEvent.setup()
    render(<SpeciesCatalogManager initialSpecies={[makeSpecies()]} />)

    await user.click(screen.getByRole('button', { name: /excluir alfavaca-cravo/i }))
    await user.click(screen.getByRole('button', { name: /^excluir$/i }))

    expect(await screen.findByText(/não é possível excluir/i)).toBeInTheDocument()
    expect(screen.getByText('Alfavaca-cravo')).toBeInTheDocument()
  })

  it('cadastra uma nova espécie pelo formulário e a insere na lista', async () => {
    vi.mocked(createSpeciesAdmin).mockResolvedValue({ species: makeSpecies({ id: 'sp-new', common_name: 'Arruda' }) })
    const user = userEvent.setup()
    render(<SpeciesCatalogManager initialSpecies={[makeSpecies()]} />)

    await user.click(screen.getByRole('button', { name: /nova/i }))
    await user.type(screen.getByPlaceholderText(/guiné, comigo-ninguém-pode/i), 'Arruda')
    await user.click(screen.getByRole('button', { name: /cadastrar espécie/i }))

    await waitFor(() => expect(createSpeciesAdmin).toHaveBeenCalled())
    expect(await screen.findByText('Arruda')).toBeInTheDocument()
  })

  it('edita uma espécie existente pelo formulário pré-preenchido', async () => {
    vi.mocked(updateSpeciesAdmin).mockResolvedValue({ species: makeSpecies({ common_name: 'Alfavaca-cravo-editada' }) })
    const user = userEvent.setup()
    render(<SpeciesCatalogManager initialSpecies={[makeSpecies()]} />)

    await user.click(screen.getByRole('button', { name: /editar alfavaca-cravo/i }))
    const nameInput = screen.getByPlaceholderText(/guiné, comigo-ninguém-pode/i)
    expect(nameInput).toHaveValue('Alfavaca-cravo')

    await user.clear(nameInput)
    await user.type(nameInput, 'Alfavaca-cravo-editada')
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(updateSpeciesAdmin).toHaveBeenCalledWith('sp-1', expect.objectContaining({ common_name: 'Alfavaca-cravo-editada' }))
    expect(await screen.findByText('Alfavaca-cravo-editada')).toBeInTheDocument()
  })
})
