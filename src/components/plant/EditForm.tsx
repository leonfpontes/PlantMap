'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Camera, MapPin } from 'lucide-react'
import { updateOccurrence } from '@/lib/actions/plants'
import { Species, PlantOccurrence, PlantCondition, PlantStage } from '@/types'
import Button from '@/components/ui/Button'
import dynamic from 'next/dynamic'
import SpeciesCombobox from '@/components/plant/SpeciesCombobox'
import { usePhotoUpload } from '@/hooks/usePhotoUpload'
import { CONDITION_OPTIONS, STAGE_OPTIONS } from '@/constants/plant'

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

interface EditFormProps {
  occurrence: PlantOccurrence
}

/**
 * Formulário de edição de ocorrência de planta.
 * Usa useSpeciesSearch para busca com debounce e usePhotoUpload para upload de foto.
 */
export default function EditForm({ occurrence }: EditFormProps) {
  const router = useRouter()
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(occurrence.species || null)
  const [serverError, setServerError]         = useState<string | null>(null)

  const { upload, uploading, preview, pickFile } = usePhotoUpload(occurrence.photo_url)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      species_id: occurrence.species_id,
      latitude:   occurrence.latitude,
      longitude:  occurrence.longitude,
      condition:  occurrence.condition,
      stage:      occurrence.stage,
      notes:      occurrence.notes || '',
    },
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
    const { url: newPhotoUrl, error: uploadError } = await upload()
    if (uploadError) { setServerError(uploadError); return }

    const result = await updateOccurrence(occurrence.id, {
      ...data,
      condition: data.condition as PlantCondition,
      stage:     data.stage as PlantStage,
      photo_url: newPhotoUrl ?? occurrence.photo_url ?? undefined,
    })

    if (result?.error) { setServerError(result.error); return }
    router.push(`/plant/${occurrence.id}`)
    router.refresh()
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
            initialLat={occurrence.latitude}
            initialLng={occurrence.longitude}
            initialZoom={14}
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
      <div>
        <SpeciesCombobox
          initialQuery={occurrence.species?.common_name}
          selected={selectedSpecies}
          onSelect={selectSpecies}
          error={errors.species_id?.message}
        />
        <input type="hidden" {...register('species_id')} />
      </div>

      {/* Condition & Stage */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Condição</label>
          <select
            {...register('condition')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            {CONDITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estágio</label>
          <select
            {...register('stage')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Photo */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Foto (opcional)</label>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 hover:border-green-400 hover:bg-green-50 transition-colors">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
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

      <div className="flex gap-3 mt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          className="w-1/2"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={isSubmitting || uploading}
          className="w-1/2"
        >
          {uploading ? 'Enviando foto...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}
