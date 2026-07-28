'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_BUCKET = 'plant-photos'
const DEFAULT_FOLDER = 'occurrences'
const MAX_SIZE_MB = 10

interface UploadResult {
  url: string | null
  error: string | null
}

interface PhotoUploadOptions {
  /** Bucket de destino. Padrão: 'plant-photos' (fotos de ocorrência do usuário). */
  bucket?: string
  /** Subpasta dentro do bucket. Padrão: 'occurrences'. */
  folder?: string
}

/**
 * Gerencia o upload de fotos para o Supabase Storage.
 * Valida tamanho máximo antes do upload e retorna a URL pública em caso de sucesso.
 * Por padrão usa o bucket `plant-photos` (foto de ocorrência); passe `bucket`/`folder`
 * para reaproveitar em outros contextos, como a foto de referência de uma espécie
 * (bucket `species-photos`, ver migration 014).
 *
 * @example
 * const { upload, uploading, preview, pickFile } = usePhotoUpload()
 */
export function usePhotoUpload(initialUrl?: string | null, options?: PhotoUploadOptions) {
  const bucket = options?.bucket ?? DEFAULT_BUCKET
  const folder = options?.folder ?? DEFAULT_FOLDER

  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState<string | null>(initialUrl ?? null)
  const [file,      setFile]      = useState<File | null>(null)

  /** Atualiza o arquivo e o preview local sem fazer upload ainda. */
  function pickFile(picked: File): string | null {
    if (picked.size > MAX_SIZE_MB * 1024 * 1024) {
      return `A foto deve ter no máximo ${MAX_SIZE_MB} MB.`
    }
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
    return null
  }

  /**
   * Faz o upload do arquivo selecionado para o Supabase Storage.
   * @returns URL pública do arquivo ou erro.
   */
  async function upload(): Promise<UploadResult> {
    if (!file) return { url: null, error: null }

    setUploading(true)
    const supabase = createClient()
    const ext  = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file)

    setUploading(false)

    if (uploadError) return { url: null, error: uploadError.message }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

  return { upload, uploading, preview, file, pickFile }
}
