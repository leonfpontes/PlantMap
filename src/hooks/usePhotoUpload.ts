'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressPhoto } from '@/lib/image'

const DEFAULT_BUCKET = 'plant-photos'
const DEFAULT_FOLDER = 'occurrences'
/** Teto do arquivo enviado ao Storage (depois da redução). */
const MAX_SIZE_MB = 10
/**
 * Teto do arquivo escolhido, antes da redução. Bem acima do de envio porque
 * foto de câmera boa passa de 10 MB e, reduzida, cai para algumas centenas
 * de KB — recusar na escolha barraria justo as melhores fotos.
 */
const MAX_PICK_MB = 40

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
    if (picked.size > MAX_PICK_MB * 1024 * 1024) {
      return `A foto deve ter no máximo ${MAX_PICK_MB} MB.`
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
    // Reduz antes de enviar: é o que faz a foto subir em segundos no 3G.
    const toSend = await compressPhoto(file)
    if (toSend.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploading(false)
      return { url: null, error: `A foto deve ter no máximo ${MAX_SIZE_MB} MB.` }
    }

    const supabase = createClient()
    const ext  = toSend.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, toSend, { contentType: toSend.type || undefined })

    setUploading(false)

    if (uploadError) return { url: null, error: uploadError.message }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

  return { upload, uploading, preview, file, pickFile }
}
