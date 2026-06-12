'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'plant-photos'
const MAX_SIZE_MB = 10

interface UploadResult {
  url: string | null
  error: string | null
}

/**
 * Gerencia o upload de fotos para o bucket plant-photos no Supabase Storage.
 * Valida tamanho máximo antes do upload e retorna a URL pública em caso de sucesso.
 *
 * @example
 * const { upload, uploading, preview, pickFile } = usePhotoUpload()
 */
export function usePhotoUpload(initialUrl?: string | null) {
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
    const path = `occurrences/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file)

    setUploading(false)

    if (uploadError) return { url: null, error: uploadError.message }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

  return { upload, uploading, preview, file, pickFile }
}
