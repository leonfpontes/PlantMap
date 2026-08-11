'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Camera, MapPin, Maximize2, Minimize2 } from 'lucide-react'
import { registerOccurrence } from '@/lib/actions/plants'
import { Species, PlantCondition, PlantStage } from '@/types'
import Button from '@/components/ui/Button'
import dynamic from 'next/dynamic'
import SpeciesCombobox from '@/components/plant/SpeciesCombobox'
import { usePhotoUpload } from '@/hooks/usePhotoUpload'
import { useGeolocation } from '@/hooks/useGeolocation'
import { CONDITION_OPTIONS, STAGE_OPTIONS } from '@/constants/plant'
import { cn } from '@/lib/utils'

const PlantMap = dynamic(() => import('@/components/map/PlantMap'), { ssr: false })

// Coordenadas de Ribeirão Preto — usadas só se o usuário negar/não tiver geolocalização.
const FALLBACK_LAT = -21.1767
const FALLBACK_LNG = -47.8208

const schema = z.object({
  species_id: z.string().min(1, 'Selecione uma espécie'),
  latitude: z.number({ message: 'Selecione a localização no mapa' }),
  longitude: z.number({ message: 'Selecione a localização no mapa' }),
  condition: z.enum(['healthy', 'fair', 'poor', 'dead']),
  stage: z.enum(['seedling', 'juvenile', 'adult', 'unknown']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

/**
 * Formulário de registro de ocorrência de planta.
 * Usa SpeciesCombobox para busca/sugestão de espécie e usePhotoUpload para upload de foto.
 */
export default function RegisterForm() {
  const router = useRouter()
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [serverError, setServerError]         = useState<string | null>(null)
  const [mapExpanded, setMapExpanded]         = useState(false)

  const { upload, uploading, preview, pickFile } = usePhotoUpload()
  const { latitude: userLat, longitude: userLng, loading: locLoading } = useGeolocation()
  const centerLat = userLat ?? FALLBACK_LAT
  const centerLng = userLng ?? FALLBACK_LNG

  // Trava o scroll da página por trás enquanto o mapa está em tela cheia.
  useEffect(() => {
    if (!mapExpanded) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mapExpanded])

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { condition: 'healthy', stage: 'adult' },
  })

  const lat = watch('latitude')
  const lng = watch('longitude')

  const selectSpecies = (species: Species) => {
    setSelectedSpecies(species)
    setValue('species_id', species.id)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = pickFile(file)
    if (err) setServerError(err)
  }

  const handleMapClick = useCallback((clickLat: number, clickLng: number) => {
    setValue('latitude', clickLat)
    setValue('longitude', clickLng)
  }, [setValue])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const { url: photo_url, error: uploadError } = await upload()
    if (uploadError) { setServerError(uploadError); return }

    const result = await registerOccurrence({
      ...data,
      condition: data.condition as PlantCondition,
      stage: data.stage as PlantStage,
      photo_url: photo_url ?? undefined,
    })

    if (result?.error) { setServerError(result.error); return }
    router.push('/map')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Location picker */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Localização <span className="text-red-500">*</span>
        </label>
        <div className={cn(
          mapExpanded
            ? 'fixed inset-0 z-50 bg-white dark:bg-gray-950'
            : 'relative h-48 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700'
        )}>
          {locLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
              <span className="text-xs text-gray-400 dark:text-gray-500">Localizando você...</span>
            </div>
          ) : (
            <PlantMap
              key={userLat && userLng ? 'user' : 'fallback'}
              onMapClick={handleMapClick}
              selectedLocation={lat && lng ? { lat, lng } : null}
              initialLat={centerLat}
              initialLng={centerLng}
              initialZoom={16}
              interactive
            />
          )}
          <button
            type="button"
            onClick={() => setMapExpanded((v) => !v)}
            aria-label={mapExpanded ? 'Recolher mapa' : 'Ampliar mapa'}
            className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {mapExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        {lat && lng ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
            <MapPin className="h-3 w-3" />
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Toque no mapa para marcar a localização</p>
        )}
        {(errors.latitude || errors.longitude) && (
          <p className="text-xs text-red-500 mt-1 dark:text-red-400">{errors.latitude?.message || errors.longitude?.message}</p>
        )}
      </div>

      {/* Species search */}
      <div>
        <SpeciesCombobox
          selected={selectedSpecies}
          onSelect={selectSpecies}
          error={errors.species_id?.message}
        />
        <input type="hidden" {...register('species_id')} />
      </div>

      {/* Condition & Stage */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Condição</label>
          <select
            {...register('condition')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {CONDITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Estágio</label>
          <select
            {...register('stage')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Photo */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Foto (opcional)</label>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 hover:border-green-400 hover:bg-green-50 transition-colors dark:border-gray-700 dark:hover:bg-green-900/20">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
          ) : (
            <>
              <Camera className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Adicionar foto</span>
            </>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Descreva o local, características especiais..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{serverError}</p>
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
