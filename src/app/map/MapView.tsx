'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Leaf, Search } from 'lucide-react'
import { searchNearby } from '@/lib/actions/plants'
import { OccurrenceWithDistance } from '@/types'
import PlantCard from '@/components/plant/PlantCard'
import { cn } from '@/lib/utils'

const PlantMap = dynamic(() => import('@/components/map/PlantMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-green-50 animate-pulse dark:bg-green-950/40" />,
})

export default function MapView() {
  const [occurrences, setOccurrences] = useState<OccurrenceWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Lista lateral: só em telas largas — no celular o mapa já ocupa a tela toda,
          e um "pin picker" com lista ao lado não faz sentido na largura de um telefone. */}
      <div className="hidden w-[360px] flex-shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white lg:flex dark:border-gray-800 dark:bg-gray-950">
        <div className="flex-shrink-0 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {loading ? 'Carregando...' : `${occurrences.length} planta${occurrences.length !== 1 ? 's' : ''} na região`}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            ))}
          </div>
        ) : occurrences.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <Leaf className="h-8 w-8 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum registro por aqui ainda</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {occurrences.map((occ) => (
              <div
                key={occ.id}
                onMouseEnter={() => setHoveredId(occ.id)}
                onMouseLeave={() => setHoveredId((id) => (id === occ.id ? null : id))}
                className={cn(
                  'rounded-2xl transition-shadow',
                  hoveredId === occ.id && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-950'
                )}
              >
                <PlantCard occurrence={occ} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coluna do mapa */}
      <div className="relative flex-1">
        <div className="absolute top-3 left-4 right-4 z-10">
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-md border border-gray-100 text-gray-400 text-sm dark:bg-gray-900 dark:border-gray-800 dark:text-gray-500"
          >
            <Search className="h-4 w-4" />
            <span>Buscar espécie...</span>
          </Link>
        </div>

        {loading ? (
          <div className="h-full w-full bg-green-50 animate-pulse dark:bg-green-950/40" />
        ) : (
          <PlantMap
            occurrences={occurrences}
            initialLat={-21.1767}
            initialLng={-47.8208}
            initialZoom={12}
            hoveredOccurrenceId={hoveredId}
            onPinHover={setHoveredId}
          />
        )}
      </div>
    </div>
  )
}
