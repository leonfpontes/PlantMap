'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface GeoState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
}

interface GeolocationContextType extends GeoState {
  getLocation: () => void
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined)

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  })

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocalização não suportada.' }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message, loading: false }))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Solicita geolocalização automaticamente ao iniciar o app no cliente
  useEffect(() => {
    getLocation()
  }, [getLocation])

  return (
    <GeolocationContext.Provider value={{ ...state, getLocation }}>
      {children}
    </GeolocationContext.Provider>
  )
}

export function useGeolocation() {
  const context = useContext(GeolocationContext)
  if (context === undefined) {
    throw new Error('useGeolocation deve ser usado dentro de um GeolocationProvider')
  }
  return context
}
