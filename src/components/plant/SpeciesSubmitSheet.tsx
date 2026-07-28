'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { submitSpecies } from '@/lib/actions/species'
import { Species, SpeciesOrigin } from '@/types'
import { ORIGIN_LABEL } from '@/constants/plant'
import { usePhotoUpload } from '@/hooks/usePhotoUpload'

const schema = z.object({
  common_name: z.string().min(2, 'Informe o nome popular ou ritual'),
  scientific_name: z.string().optional(),
  family: z.string().optional(),
  origin: z.enum(['native', 'exotic', 'naturalized']),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SpeciesSubmitSheetProps {
  open: boolean
  initialCommonName?: string
  onClose: () => void
  onSubmitted: (species: Species) => void
}

/**
 * Formulário de sugestão de uma erva que ainda não está no catálogo.
 * A submissão nasce com status 'pending' (migration 013): fica disponível de
 * imediato só para quem sugeriu, e some da busca geral até um admin revisar.
 */
export default function SpeciesSubmitSheet({
  open,
  initialCommonName,
  onClose,
  onSubmitted,
}: SpeciesSubmitSheetProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { origin: 'native' },
  })

  const { upload, uploading, preview, pickFile } = usePhotoUpload(null, {
    bucket: 'species-photos',
    folder: 'species',
  })

  useEffect(() => {
    if (open) {
      reset({ common_name: initialCommonName || '', origin: 'native' })
      setServerError(null)
    }
  }, [open, initialCommonName, reset])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = pickFile(file)
    if (err) setServerError(err)
  }

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const { url: image_url, error: uploadError } = await upload()
    if (uploadError) { setServerError(uploadError); return }

    const result = await submitSpecies({
      ...data,
      origin: data.origin as SpeciesOrigin,
      image_url: image_url ?? undefined,
    })

    if (result.error || !result.species) {
      setServerError(result.error || 'Não foi possível enviar a sugestão')
      return
    }
    onSubmitted(result.species)
  }

  return (
    <BottomSheet title="Sugerir nova erva" open={open} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          A erva entra como <strong>pendente</strong> e só aparece na busca de todos depois que um
          administrador do terreiro revisar. Você já pode usá-la nos seus próprios registros enquanto isso.
        </p>

        <Input
          label="Nome popular / ritual *"
          placeholder="Ex: Guiné, Comigo-ninguém-pode..."
          error={errors.common_name?.message}
          {...register('common_name')}
        />
        <Input
          label="Nome científico (se souber)"
          placeholder="Ex: Petiveria alliacea"
          {...register('scientific_name')}
        />
        <Input label="Família botânica (opcional)" {...register('family')} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Origem</label>
          <select
            {...register('origin')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {Object.entries(ORIGIN_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Observações (opcional)</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Uso ritual, orixá associado, onde costuma ser encontrada..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Foto de referência (opcional)
          </label>
          <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
            Uma foto que identifique a espécie em si — diferente da foto que você tira de cada
            ocorrência registrada.
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 hover:border-green-400 hover:bg-green-50 transition-colors dark:border-gray-700 dark:hover:bg-green-900/20">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
            ) : (
              <>
                <Camera className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Adicionar foto da espécie</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        </div>

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{serverError}</p>
        )}

        <Button type="submit" loading={isSubmitting || uploading} className="w-full">
          {uploading ? 'Enviando foto...' : 'Enviar para aprovação'}
        </Button>
      </form>
    </BottomSheet>
  )
}
