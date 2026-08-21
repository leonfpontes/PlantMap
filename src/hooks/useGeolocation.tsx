'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { GeoFix, bestFix, shouldAcceptFix, GOOD_ACCURACY_M } from '@/lib/geo'

interface GeoState {
  latitude: number | null
  longitude: number | null
  /** Raio de erro em metros da leitura atual — null enquanto não houver leitura. */
  accuracy: number | null
  /** Quando a leitura atual foi feita (epoch ms), pra UI poder dizer se está velha. */
  timestamp: number | null
  error: string | null
  loading: boolean
  /** Se há um watch contínuo ativo neste momento. */
  watching: boolean
}

interface AcquireOptions {
  /** Para de insistir assim que chegar nessa precisão. */
  targetAccuracy?: number
  /** Teto de tempo; devolve a melhor leitura obtida até ali. */
  timeoutMs?: number
  /** Chamado a cada leitura, pra UI mostrar a precisão convergindo. */
  onProgress?: (fix: GeoFix) => void
}

interface GeolocationContextType extends GeoState {
  /** Leitura pontual. */
  getLocation: () => void
  /**
   * Liga o rastreamento contínuo e devolve a função que o desliga. Use pelo
   * hook `useGeolocationWatch()`, que já cuida do ciclo de vida.
   */
  retainWatch: () => () => void
  /**
   * Insiste até convergir numa precisão alvo e resolve com a melhor leitura
   * obtida (ou null se nenhuma veio). É o caminho pra "usar minha localização
   * atual" num registro, onde vale esperar alguns segundos por um ponto bom.
   */
  acquireBestFix: (opts?: AcquireOptions) => Promise<GeoFix | null>
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined)

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  // maximumAge 0 é essencial aqui: com cache o navegador devolve de novo a
  // leitura antiga e o ponto não sai do lugar enquanto se anda.
  maximumAge: 0,
  timeout: 20_000,
}

function mensagemDeErro(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) return 'Permissão de localização negada.'
  if (err.code === err.POSITION_UNAVAILABLE) return 'Não foi possível obter sua localização.'
  if (err.code === err.TIMEOUT) return 'A localização demorou demais para responder.'
  return err.message
}

/**
 * Provider de geolocalização do app.
 *
 * Antes isto chamava `getCurrentPosition` uma única vez na montagem e nunca
 * mais — o ponto azul ficava congelado no primeiro fix da sessão, que é
 * justamente o pior deles (com `enableHighAccuracy`, o navegador devolve na
 * hora um fix de rede e o chip de GPS só converge alguns segundos depois).
 * Andar não movia o ponto.
 *
 * Agora quem precisa de posição ao vivo liga um `watchPosition` compartilhado
 * via `useGeolocationWatch()`. O watch é contado por referência e só fica de
 * pé enquanto houver alguém consumindo, porque GPS contínuo custa bateria e
 * não faz sentido rodar nas telas que não mostram mapa.
 */
export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    loading: false,
    watching: false,
  })

  // Última leitura aceita, em ref: o filtro de qualidade precisa dela de forma
  // síncrona a cada evento, e o estado do React chega tarde demais pra isso.
  const currentFix = useRef<GeoFix | null>(null)
  const watchId = useRef<number | null>(null)
  const retainCount = useRef(0)

  const aplicarFix = useCallback((fix: GeoFix) => {
    if (!shouldAcceptFix(currentFix.current, fix)) return
    currentFix.current = fix
    setState((s) => ({
      ...s,
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracy: fix.accuracy,
      timestamp: fix.timestamp,
      error: null,
      loading: false,
    }))
  }, [])

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocalização não suportada.' }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => aplicarFix(paraFix(position)),
      (err) => setState((s) => ({ ...s, error: mensagemDeErro(err), loading: false })),
      WATCH_OPTIONS
    )
  }, [aplicarFix])

  const retainWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocalização não suportada.' }))
      return () => {}
    }

    retainCount.current += 1

    if (watchId.current === null) {
      setState((s) => ({ ...s, loading: s.latitude === null, error: null, watching: true }))
      watchId.current = navigator.geolocation.watchPosition(
        (position) => aplicarFix(paraFix(position)),
        (err) => setState((s) => ({ ...s, error: mensagemDeErro(err), loading: false })),
        WATCH_OPTIONS
      )
    }

    let liberado = false
    return () => {
      // Guarda contra release duplo (StrictMode, cleanup chamado duas vezes):
      // sem isso a contagem desce demais e derruba o watch de quem ainda usa.
      if (liberado) return
      liberado = true

      retainCount.current -= 1
      if (retainCount.current <= 0) {
        retainCount.current = 0
        if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current)
          watchId.current = null
        }
        setState((s) => ({ ...s, watching: false }))
      }
    }
  }, [aplicarFix])

  const acquireBestFix = useCallback(
    ({ targetAccuracy = GOOD_ACCURACY_M, timeoutMs = 12_000, onProgress }: AcquireOptions = {}) =>
      new Promise<GeoFix | null>((resolve) => {
        if (!navigator.geolocation) {
          setState((s) => ({ ...s, error: 'Geolocalização não suportada.' }))
          resolve(null)
          return
        }

        setState((s) => ({ ...s, loading: true, error: null }))

        // Watch próprio, separado do compartilhado: aqui o objetivo não é
        // acompanhar o movimento, é ficar insistindo até a precisão convergir
        // e então parar — o primeiro fix quase nunca é o melhor.
        let melhor: GeoFix | null = null
        let encerrado = false
        let id: number | null = null
        let timer: ReturnType<typeof setTimeout> | null = null

        const encerrar = () => {
          if (encerrado) return
          encerrado = true
          if (id !== null) navigator.geolocation.clearWatch(id)
          if (timer) clearTimeout(timer)
          setState((s) => ({ ...s, loading: false }))
          resolve(melhor)
        }

        timer = setTimeout(encerrar, timeoutMs)

        id = navigator.geolocation.watchPosition(
          (position) => {
            const fix = paraFix(position)
            melhor = bestFix(melhor, fix)
            // Alimenta também o estado global: se o usuário está esperando um
            // ponto bom, o mapa deve acompanhar essa convergência ao vivo.
            aplicarFix(fix)
            if (melhor) onProgress?.(melhor)
            if (melhor && melhor.accuracy <= targetAccuracy) encerrar()
          },
          (err) => {
            setState((s) => ({ ...s, error: mensagemDeErro(err) }))
            // Erro não aborta na hora: se já houver alguma leitura, ela ainda
            // serve; o timeout resolve com o que tiver.
            if (!melhor) encerrar()
          },
          WATCH_OPTIONS
        )
      }),
    [aplicarFix]
  )

  return (
    <GeolocationContext.Provider
      value={{ ...state, getLocation, retainWatch, acquireBestFix }}
    >
      {children}
    </GeolocationContext.Provider>
  )
}

function paraFix(position: GeolocationPosition): GeoFix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    // Navegadores antigos podem não reportar accuracy; tratar como péssima é
    // mais seguro do que como ótima, porque o filtro usa esse número.
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : Number.MAX_SAFE_INTEGER,
    timestamp: position.timestamp,
  }
}

/**
 * Hook customizado para consumir o contexto de geolocalização.
 * Deve ser obrigatoriamente utilizado dentro de um `<GeolocationProvider>`.
 */
export function useGeolocation() {
  const context = useContext(GeolocationContext)
  if (context === undefined) {
    throw new Error('useGeolocation deve ser usado dentro de um GeolocationProvider')
  }
  return context
}

/**
 * Mesma coisa, mas mantém um `watchPosition` ativo enquanto o componente
 * estiver montado. É o que faz o ponto do usuário acompanhar quem está
 * andando — use nas telas com mapa, não nas outras.
 */
export function useGeolocationWatch() {
  const context = useGeolocation()
  const { retainWatch } = context

  useEffect(() => retainWatch(), [retainWatch])

  return context
}
