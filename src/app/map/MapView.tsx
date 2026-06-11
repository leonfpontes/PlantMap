'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { searchNearby } from '@/lib/actions/plants'
import { OccurrenceWithDistance } from '@/types'

const PlantMap = dynamic(() => import('@/components/map/PlantMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-green-50 animate-pulse" />,
})

export default function MapView() {
  const [occurrences, setOccurrences] = useState<OccurrenceWithDistance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Coordenadas de Ribeirão Preto
    const lat = -21.1767
    const lng = -47.8208
    
    // Busca todas as ocorrências em um raio grande (100km) ao redor de Ribeirão Preto
    searchNearby(lat, lng, 100000)
      .then((data) => {
        setOccurrences(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Erro ao buscar ocorrências para o mapa:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="h-full w-full bg-green-50 animate-pulse" />
  }

  return (
    <PlantMap
      occurrences={occurrences}
      initialLat={-21.1767}
      initialLng={-47.8208}
      initialZoom={12}
    />
  )
}
