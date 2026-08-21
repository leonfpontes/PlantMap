import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { GeolocationProvider, useGeolocation, useGeolocationWatch } from '@/hooks/useGeolocation'
import { formatAccuracy } from '@/lib/geo'

interface Leitura { lat: number; lng: number; acc: number; t: number }

/**
 * GPS falso controlado pelo teste: `emitir()` dispara uma leitura para todos os
 * watchers ativos, então dá pra encenar exatamente a sequência que acontece na
 * rua (fix de rede ruim primeiro, GPS convergindo depois, usuário andando).
 */
function fakeGeolocation() {
  const watchers = new Map<number, PositionCallback>()
  let nextId = 1
  const api = {
    getCurrentPosition: vi.fn((ok: PositionCallback) => {
      if (api.ultima) ok(paraPosition(api.ultima))
    }),
    watchPosition: vi.fn((ok: PositionCallback) => {
      const id = nextId++
      watchers.set(id, ok)
      return id
    }),
    clearWatch: vi.fn((id: number) => { watchers.delete(id) }),
    ultima: null as Leitura | null,
    get ativos() { return watchers.size },
    emitir(l: Leitura) {
      api.ultima = l
      watchers.forEach((ok) => ok(paraPosition(l)))
    },
  }
  return api
}

function paraPosition(l: Leitura): GeolocationPosition {
  return {
    coords: {
      latitude: l.lat, longitude: l.lng, accuracy: l.acc,
      altitude: null, altitudeAccuracy: null, heading: null, speed: null,
      toJSON: () => ({}),
    },
    timestamp: l.t,
    toJSON: () => ({}),
  } as GeolocationPosition
}

let geo: ReturnType<typeof fakeGeolocation>

beforeEach(() => {
  geo = fakeGeolocation()
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geo })
})

afterEach(() => { vi.useRealTimers() })

function Sonda() {
  const { latitude, longitude, accuracy, watching } = useGeolocationWatch()
  return (
    <div>
      <span data-testid="pos">{latitude === null ? '—' : `${latitude.toFixed(5)},${longitude!.toFixed(5)}`}</span>
      <span data-testid="acc">{accuracy === null ? '—' : formatAccuracy(accuracy)}</span>
      <span data-testid="watching">{String(watching)}</span>
    </div>
  )
}

describe('useGeolocationWatch', () => {
  it('acompanha o usuário andando, em vez de travar na primeira leitura', async () => {
    render(<GeolocationProvider><Sonda /></GeolocationProvider>)

    await waitFor(() => expect(screen.getByTestId('watching').textContent).toBe('true'))

    act(() => geo.emitir({ lat: -21.17600, lng: -47.82000, acc: 12, t: 1000 }))
    expect(screen.getByTestId('pos').textContent).toBe('-21.17600,-47.82000')

    // Andou alguns metros: a precisão oscila um pouco, mas o ponto tem que seguir.
    act(() => geo.emitir({ lat: -21.17620, lng: -47.82015, acc: 14, t: 2500 }))
    expect(screen.getByTestId('pos').textContent).toBe('-21.17620,-47.82015')

    act(() => geo.emitir({ lat: -21.17641, lng: -47.82030, acc: 11, t: 4000 }))
    expect(screen.getByTestId('pos').textContent).toBe('-21.17641,-47.82030')
    expect(screen.getByTestId('acc').textContent).toBe('±11 m')
  })

  it('descarta o fix de rede que jogaria o ponto longe', async () => {
    render(<GeolocationProvider><Sonda /></GeolocationProvider>)
    await waitFor(() => expect(screen.getByTestId('watching').textContent).toBe('true'))

    act(() => geo.emitir({ lat: -21.17600, lng: -47.82000, acc: 9, t: 1000 }))
    act(() => geo.emitir({ lat: -21.19000, lng: -47.84000, acc: 1500, t: 2000 }))

    expect(screen.getByTestId('pos').textContent).toBe('-21.17600,-47.82000')
    expect(screen.getByTestId('acc').textContent).toBe('±9 m')
  })

  it('para o watch quando o último consumidor desmonta', async () => {
    const { unmount } = render(<GeolocationProvider><Sonda /></GeolocationProvider>)
    await waitFor(() => expect(geo.ativos).toBe(1))
    unmount()
    expect(geo.clearWatch).toHaveBeenCalled()
    expect(geo.ativos).toBe(0)
  })

  it('mantém um único watch compartilhado entre vários consumidores', async () => {
    function Dois() {
      return <><Sonda /><Sonda /></>
    }
    const { unmount } = render(<GeolocationProvider><Dois /></GeolocationProvider>)
    await waitFor(() => expect(geo.ativos).toBe(1))
    expect(geo.watchPosition).toHaveBeenCalledTimes(1)
    unmount()
    expect(geo.ativos).toBe(0)
  })
})

describe('acquireBestFix', () => {
  function Botao({ onFix }: { onFix: (acc: number | null) => void }) {
    const { acquireBestFix } = useGeolocation()
    return (
      <button onClick={() => acquireBestFix().then((f) => onFix(f?.accuracy ?? null))}>
        localizar
      </button>
    )
  }

  it('espera o GPS convergir em vez de aceitar a primeira leitura', async () => {
    const onFix = vi.fn()
    render(<GeolocationProvider><Botao onFix={onFix} /></GeolocationProvider>)

    act(() => { screen.getByText('localizar').click() })
    await waitFor(() => expect(geo.ativos).toBe(1))

    // Primeira leitura: fix de rede, péssimo. Não pode encerrar a busca.
    act(() => geo.emitir({ lat: -21.176, lng: -47.820, acc: 1800, t: 1000 }))
    expect(onFix).not.toHaveBeenCalled()

    act(() => geo.emitir({ lat: -21.1761, lng: -47.8201, acc: 120, t: 2000 }))
    expect(onFix).not.toHaveBeenCalled()

    // Chegou na precisão alvo: resolve com ela e desliga o watch.
    act(() => geo.emitir({ lat: -21.1762, lng: -47.8202, acc: 8, t: 3000 }))
    await waitFor(() => expect(onFix).toHaveBeenCalledWith(8))
    expect(geo.ativos).toBe(0)
  })

  it('devolve a melhor leitura obtida quando estoura o tempo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onFix = vi.fn()
    render(<GeolocationProvider><Botao onFix={onFix} /></GeolocationProvider>)

    act(() => { screen.getByText('localizar').click() })
    await waitFor(() => expect(geo.ativos).toBe(1))

    act(() => geo.emitir({ lat: -21.176, lng: -47.820, acc: 400, t: 1000 }))
    act(() => geo.emitir({ lat: -21.1761, lng: -47.8201, acc: 90, t: 2000 }))
    act(() => geo.emitir({ lat: -21.1762, lng: -47.8202, acc: 150, t: 3000 }))

    await act(async () => { vi.advanceTimersByTime(12_000) })

    await waitFor(() => expect(onFix).toHaveBeenCalledWith(90))
    expect(geo.ativos).toBe(0)
  })
})
