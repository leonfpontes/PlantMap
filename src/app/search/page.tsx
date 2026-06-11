'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PlantCard from '@/components/plant/PlantCard'
import { searchNearby } from '@/lib/actions/plants'
import { OccurrenceWithDistance } from '@/types'
import { useGeolocation } from '@/hooks/useGeolocation'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(5)
  const [results, setResults] = useState<OccurrenceWithDistance[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { latitude, longitude, getLocation, loading: locLoading } = useGeolocation()

  const handleSearch = async () => {
    setLoading(true)
    setSearched(true)

    let lat = latitude
    let lng = longitude

    if (!lat || !lng) {
      await new Promise<void>((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude
              lng = pos.coords.longitude
              resolve()
            },
            () => {
              // Fallback para Ribeirão Preto caso o usuário negue/falhe a permissão
              lat = -21.1767
              lng = -47.8208
              resolve()
            }
          )
        } else {
          // Fallback se geolocalização não for suportada
          lat = -21.1767
          lng = -47.8208
          resolve()
        }
      })
    }

    if (!lat || !lng) {
      lat = -21.1767
      lng = -47.8208
    }

    try {
      const data = await searchNearby(lat, lng, radius * 1000)
      const filtered = query
        ? data.filter((o) =>
            o.species?.common_name?.toLowerCase().includes(query.toLowerCase()) ||
            o.species?.scientific_name?.toLowerCase().includes(query.toLowerCase())
          )
        : data
      setResults(filtered)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileShell>
      <PageHeader title="Buscar Plantas" showBack={false} />

      <div className="flex flex-col gap-4 p-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nome da espécie..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <SlidersHorizontal className="h-4 w-4" />
              Raio: <span className="text-green-700">{radius} km</span>
            </label>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-green-700"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || locLoading}
          className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Buscar próximo a mim
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-gray-300 mb-3" />
            <p className="font-medium text-gray-600">Nenhuma planta encontrada</p>
            <p className="text-sm text-gray-400 mt-1">Tente aumentar o raio de busca</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="mb-3 text-sm text-gray-500">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-3">
              {results.map((occ) => (
                <PlantCard key={occ.id} occurrence={occ} />
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </MobileShell>
  )
}
