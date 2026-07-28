'use client'

import { useState } from 'react'
import { Search, Camera, ImageOff } from 'lucide-react'
import { Species } from '@/types'
import { listApprovedSpeciesCatalog, updateSpeciesImage } from '@/lib/actions/species'
import { usePhotoUpload } from '@/hooks/usePhotoUpload'

interface SpeciesCatalogManagerProps {
  initialSpecies: Species[]
}

/**
 * Gestão da foto de referência de cada espécie aprovada do catálogo (migration 014).
 * Lista sempre traz as espécies sem foto primeiro, para priorizar o backfill —
 * hoje nenhuma das ~170 espécies seedadas tem `image_url` preenchido.
 */
export default function SpeciesCatalogManager({ initialSpecies }: SpeciesCatalogManagerProps) {
  const [species, setSpecies] = useState(initialSpecies)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const handleSearch = async (value: string) => {
    setQuery(value)
    setSearching(true)
    const results = await listApprovedSpeciesCatalog(value)
    setSpecies(results)
    setSearching(false)
  }

  const handlePhotoUpdated = (id: string, imageUrl: string) => {
    setSpecies((prev) => prev.map((s) => (s.id === id ? { ...s, image_url: imageUrl } : s)))
  }

  const missingCount = species.filter((s) => !s.image_url).length

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar espécie no catálogo..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
        />
      </div>

      <p className="text-xs text-gray-500">
        {searching
          ? 'Buscando...'
          : missingCount > 0
            ? `${missingCount} de ${species.length} sem foto de referência (mostradas primeiro)`
            : `${species.length} espécies, todas com foto`}
      </p>

      <div className="flex flex-col gap-2">
        {species.map((sp) => (
          <SpeciesPhotoRow key={sp.id} species={sp} onUpdated={(url) => handlePhotoUpdated(sp.id, url)} />
        ))}
      </div>
    </div>
  )
}

function SpeciesPhotoRow({
  species,
  onUpdated,
}: {
  species: Species
  onUpdated: (url: string) => void
}) {
  const { upload, uploading, preview, pickFile } = usePhotoUpload(species.image_url, {
    bucket: 'species-photos',
    folder: 'species',
  })
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const pickError = pickFile(file)
    if (pickError) { setError(pickError); return }

    const { url, error: uploadError } = await upload()
    if (uploadError || !url) { setError(uploadError || 'Falha no upload'); return }

    const result = await updateSpeciesImage(species.id, url)
    if (result.error) { setError(result.error); return }

    setError(null)
    onUpdated(url)
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-green-50">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={species.common_name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-5 w-5 text-gray-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{species.common_name}</p>
        {species.scientific_name && (
          <p className="truncate text-xs italic text-gray-500">{species.scientific_name}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <label className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-green-50 text-green-700 transition-colors hover:bg-green-100">
        {uploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
      </label>
    </div>
  )
}
