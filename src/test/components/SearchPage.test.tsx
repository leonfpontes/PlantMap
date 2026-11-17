import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/actions/plants', () => ({ searchNearby: vi.fn() }))
vi.mock('@/hooks/useUser', () => ({ useUser: () => ({ user: null, loading: false }) }))
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ latitude: -21.17, longitude: -47.82, acquireBestFix: vi.fn() }),
}))
// A casca (cabeçalho, barra de navegação) não é o que se testa aqui.
vi.mock('@/components/layout/PageHeader', () => ({ default: () => null }))
vi.mock('@/components/layout/BottomNav', () => ({ default: () => null }))
vi.mock('@/components/plant/PlantCard', () => ({
  default: ({ occurrence }: { occurrence: { species?: { common_name: string } } }) => (
    <div data-testid="card">{occurrence.species?.common_name}</div>
  ),
}))

import { searchNearby } from '@/lib/actions/plants'
import SearchPage from '@/app/search/page'
import type { OccurrenceWithDistance } from '@/types'

function planta(id: string, nome: string): OccurrenceWithDistance {
  return { id, species: { common_name: nome, scientific_name: null } } as unknown as OccurrenceWithDistance
}

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(searchNearby).mockReset()
  vi.mocked(searchNearby).mockResolvedValue([planta('1', 'Arruda'), planta('2', 'Guiné'), planta('3', 'Arruda-fedorenta')])
})

describe('SearchPage', () => {
  it('abre já mostrando as plantas mais próximas, sem precisar apertar buscar', async () => {
    render(<SearchPage />)
    expect(await screen.findAllByTestId('card')).toHaveLength(3)
    // Padrão: qualquer distância (busca sem raio).
    expect(searchNearby).toHaveBeenCalledWith(-21.17, -47.82, null, expect.any(Number))
  })

  it('filtra enquanto digita, sem ir ao servidor de novo', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await screen.findAllByTestId('card')

    await user.type(screen.getByLabelText('Nome da planta'), 'guine')
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual(['Guiné'])
    expect(searchNearby).toHaveBeenCalledTimes(1)
  })

  it('trocar a distância refaz a busca com o raio escolhido', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await screen.findAllByTestId('card')

    await user.click(screen.getByRole('button', { name: 'Até 5 km' }))
    await waitFor(() => expect(searchNearby).toHaveBeenLastCalledWith(-21.17, -47.82, 5000))
    expect(screen.getByRole('button', { name: 'Até 5 km' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sem resultado para o nome, diz qual nome não foi achado', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)
    await screen.findAllByTestId('card')

    await user.type(screen.getByLabelText('Nome da planta'), 'manjericao')
    expect(screen.getByText('Nenhuma planta com o nome “manjericao”')).toBeInTheDocument()
  })
})
