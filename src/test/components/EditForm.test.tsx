import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlantOccurrence } from '@/types'

vi.mock('@/lib/actions/plants', () => ({ updateOccurrence: vi.fn() }))

const back = vi.fn()
const replace = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }))

// O mapa depende de WebGL e não participa do que se testa aqui.
vi.mock('next/dynamic', () => ({
  default: () => function MapaFalso() { return <div data-testid="mapa" /> },
}))
vi.mock('@/hooks/usePhotoUpload', () => ({
  usePhotoUpload: () => ({ upload: async () => ({ url: null }), uploading: false, preview: null, pickFile: () => null }),
}))
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocationWatch: () => ({ latitude: null, longitude: null, loading: false, acquireBestFix: vi.fn() }),
  useGeolocation: () => ({ latitude: null, longitude: null, loading: false, acquireBestFix: vi.fn() }),
}))

import { updateOccurrence } from '@/lib/actions/plants'
import EditForm from '@/components/plant/EditForm'

const OCC = {
  id: 'occ-1', user_id: 'u1', species_id: 'sp-1',
  species: { id: 'sp-1', common_name: 'Guiné', scientific_name: null, family: null, origin: 'native',
    description: null, image_url: null, status: 'approved', submitted_by: null, reviewed_by: null,
    reviewed_at: null, rejection_reason: null, created_at: '' },
  latitude: -21.1767, longitude: -47.8208, condition: 'healthy', stage: 'adult',
  notes: null, photo_url: null, verified: false, created_at: '', updated_at: '',
} as PlantOccurrence

function definirHistorico(length: number) {
  Object.defineProperty(window, 'history', {
    configurable: true,
    value: { ...window.history, length },
  })
}

beforeEach(() => {
  vi.mocked(updateOccurrence).mockReset()
  vi.mocked(updateOccurrence).mockResolvedValue({ success: true })
  back.mockReset()
  replace.mockReset()
})

async function salvar() {
  const user = userEvent.setup()
  render(<EditForm occurrence={OCC} />)
  await user.click(screen.getByRole('button', { name: /salvar/i }))
  await waitFor(() => expect(updateOccurrence).toHaveBeenCalled())
}

describe('EditForm — histórico depois de salvar', () => {
  it('consome a entrada do formulário, pra o "voltar" seguinte ir ao mapa', async () => {
    definirHistorico(3) // mapa -> detalhe -> edição
    await salvar()

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1))
    // push empilharia o detalhe por cima do formulário e o traria de volta no
    // "voltar"; replace deixaria duas entradas de detalhe seguidas.
    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('cai no replace quando a edição foi aberta direto, sem histórico atrás', async () => {
    definirHistorico(1)
    await salvar()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/plant/occ-1'))
    expect(back).not.toHaveBeenCalled()
  })

  it('não navega quando a gravação falha', async () => {
    definirHistorico(3)
    vi.mocked(updateOccurrence).mockResolvedValue({ error: 'sem permissão' })
    await salvar()

    expect(await screen.findByText('sem permissão')).toBeInTheDocument()
    expect(back).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
