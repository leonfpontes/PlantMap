'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Camera, MapPin, Loader2 } from 'lucide-react'
import { registerOccurrence, searchSpecies } from '@/lib/actions/plants'
import { createClient } from '@/lib/supabase/client'
import { Species, PlantCondition, PlantStage } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import dynamic from 'next/dynamic'

const PlantMap = dynamic(() => import('@/components/map/PlantMap'), { ssr: false })

const schema = z.object({
  species_id: z.string().min(1, 'Selecione uma espécie'),
  latitude: z.number({ message: 'Selecione a localização no mapa' }),
  longitude: z.number({ message: 'Selecione a localização no mapa' }),
  condition: z.enum(['healthy', 'fair', 'poor', 'dead']),
  stage: z.enum(['seedling', 'juvenile', 'adult', 'unknown']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterForm() {
  const router = useRouter()
  const [speciesQuery, setSpeciesQuery] = useState('')
  const [speciesList, setSpeciesList] = useState<Species[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { condition: 'healthy', stage: 'adult' },
  })

  const lat = watch('latitude')
  const lng = watch('longitude')

  const handleSpeciesSearch = (query: string) => {
    setSpeciesQuery(query)
    if (searchTimer) clearTimeout(searchTimer)
    if (query.length < 2) { setSpeciesList([]); return }
    const timer = setTimeout(async () => {
      const results = await searchSpecies(query)
      setSpeciesList(results)
    }, 300)
    setSearchTimer(timer)
  }

  const selectSpecies = (species: Species) => {
    setSelectedSpecies(species)
    setValue('species_id', species.id)
    setSpeciesQuery(species.common_name)
    setSpeciesList([])
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleMapClick = useCallback((clickLat: number, clickLng: number) => {
    setValue('latitude', clickLat)
    setValue('longitude', clickLng)
  }, [setValue])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    let photo_url: string | undefined

    if (photoFile) {
      setUploading(true)
      const supabase = createClient()
      const ext = photoFile.name.split('.').pop()
      const path = `occurrences/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, photoFile)
      if (uploadError) { setServerError(uploadError.message); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('plant-photos').getPublicUrl(path)
      photo_url = urlData.publicUrl
      setUploading(false)
    }

    const result = await registerOccurrence({
      ...data,
      condition: data.condition as PlantCondition,
      stage: data.stage as PlantStage,
      photo_url,
    })

    if (result?.error) { setServerError(result.error); return }
    router.push('/map')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Location picker */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Localização <span className="text-red-500">*</span>
        </label>
        <div className="h-48 w-full overflow-hidden rounded-xl border border-gray-200">
          <PlantMap
            onMapClick={handleMapClick}
            selectedLocation={lat && lng ? { lat, lng } : null}
            initialZoom={13}
            interactive
          />
        </div>
        {lat && lng ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
            <MapPin className="h-3 w-3" />
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">Toque no mapa para marcar a localização</p>
        )}
        {(errors.latitude || errors.longitude) && (
          <p className="text-xs text-red-500 mt-1">{errors.latitude?.message || errors.longitude?.message}</p>
        )}
      </div>

      {/* Species search */}
      <div className="relative">
        <Input
          label="Espécie *"
          value={speciesQuery}
          onChange={(e) => handleSpeciesSearch(e.target.value)}
          placeholder="Buscar por nome comum ou científico..."
          error={errors.species_id?.message}
        />
        <input type="hidden" {...register('species_id')} />
        {speciesList.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {speciesList.map((sp) => (
              <li key={sp.id}>
                <button
                  type="button"
                  onClick={() => selectSpecies(sp)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{sp.common_name}</span>
                  <span className="ml-2 text-xs italic text-gray-500">{sp.scientific_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedSpecies && (
          <p className="mt-1 text-xs text-green-700 italic">{selectedSpecies.scientific_name}</p>
        )}
      </div>

      {/* Condition & Stage */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Condição</label>
          <select
            {...register('condition')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            <option value="healthy">Saudável</option>
            <option value="fair">Regular</option>
            <option value="poor">Ruim</option>
            <option value="dead">Morta</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estágio</label>
          <select
            {...register('stage')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            <option value="seedling">Muda</option>
            <option value="juvenile">Jovem</option>
            <option value="adult">Adulta</option>
            <option value="unknown">Desconhecido</option>
          </select>
        </div>
      </div>

      {/* Photo */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Foto (opcional)</label>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 hover:border-green-400 hover:bg-green-50 transition-colors">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
          ) : (
            <>
              <Camera className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500">Adicionar foto</span>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Descreva o local, características especiais..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
        />
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting || uploading}
        className="w-full"
      >
        {uploading ? 'Enviando foto...' : 'Registrar Ocorrência'}
      </Button>
    </form>
  )
}
