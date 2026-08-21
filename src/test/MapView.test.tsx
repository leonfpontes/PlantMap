import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/actions/plants', () => ({ searchNearby: vi.fn() }))
vi.mock('next/dynamic', () => ({
  // O mapa real depende de WebGL. O dublê reproduz a única coisa que importa
  // aqui: é o mapa quem segura o rastreamento de GPS. Era esse acoplamento —
  // desmontar o mapa derruba o watch, remontar entrega posição nova — que
  // fechava o ciclo e fazia a tela piscar.
  default: () => function MapaFalso() {
    useGeolocationWatch()
    return <div data-testid="mapa" />
  },
}))

import { searchNearby } from '@/lib/actions/plants'
import { GeolocationProvider, useGeolocationWatch } from '@/hooks/useGeolocation'
import MapView from '@/app/map/MapView'

let emitir: (lat: number, lng: number) => void

beforeEach(() => {
  vi.mocked(searchNearby).mockReset()
  vi.mocked(searchNearby).mockResolvedValue([])

  const watchers = new Map<number, PositionCallback>()
  let next = 1
  emitir = (latitude, longitude) =>
    watchers.forEach((ok) =>
      ok({
        coords: { latitude, longitude, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}) },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition)
    )

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn((ok: PositionCallback) => { const id = next++; watchers.set(id, ok); return id }),
      clearWatch: vi.fn((id: number) => { watchers.delete(id) }),
    },
  })
})

function montar() {
  return render(<GeolocationProvider><MapView /></GeolocationProvider>)
}

describe('MapView', () => {
  it('não refaz a busca a cada correção do GPS parado', async () => {
    montar()
    // Espera o mapa montar: é ele que registra o watch, então antes disso as
    // posições emitidas não teriam pra quem chegar.
    await waitFor(() => expect(screen.getByTestId('mapa')).toBeInTheDocument())
    expect(searchNearby).toHaveBeenCalledTimes(1)

    // Primeira posição real, longe do fallback: essa vale uma busca.
    act(() => emitir(-21.190000, -47.840000))
    await waitFor(() => expect(searchNearby).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByTestId('mapa')).toBeInTheDocument())

    // Jitter típico de GPS parado: metros, não quarteirões. Nenhuma dessas
    // pode custar uma busca nova.
    act(() => emitir(-21.190003, -47.840002))
    act(() => emitir(-21.189998, -47.840005))
    act(() => emitir(-21.190001, -47.839999))
    act(() => emitir(-21.190004, -47.840001))
    await act(async () => {})

    expect(searchNearby).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
  })

  it('mantém o mapa montado durante uma rebusca, sem voltar pro esqueleto', async () => {
    montar()
    await waitFor(() => expect(screen.getByTestId('mapa')).toBeInTheDocument())

    // Deslocamento grande o bastante pra valer uma busca nova.
    act(() => emitir(-21.2200, -47.8800))

    // O mapa não pode desmontar: é ele que segura o rastreamento de GPS, e
    // desmontá-lo reiniciava o ciclo que fazia a tela piscar.
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
    await waitFor(() => expect(vi.mocked(searchNearby).mock.calls.length).toBeGreaterThan(1))
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
  })

  it('refaz a busca quando o usuário realmente se desloca', async () => {
    montar()
    await waitFor(() => expect(screen.getByTestId('mapa')).toBeInTheDocument())
    expect(searchNearby).toHaveBeenCalledTimes(1)

    act(() => emitir(-21.1900, -47.8400))
    await waitFor(() => expect(searchNearby).toHaveBeenCalledTimes(2))

    act(() => emitir(-21.2200, -47.8800)) // ~5 km adiante
    await waitFor(() => expect(searchNearby).toHaveBeenCalledTimes(3))
    expect(vi.mocked(searchNearby).mock.calls[2][0]).toBeCloseTo(-21.22, 4)
  })
})
