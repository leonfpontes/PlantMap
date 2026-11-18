/**
 * Redução de fotos no próprio celular, antes do envio.
 *
 * Foto de câmera de celular sai com 3 a 12 MB. Mandar isso pelo 3G, no meio
 * da rua, é o que deixava o "Enviando foto..." rodando por minutos (ou
 * falhando). Reduzida para no máximo 2048 px no lado maior, em JPEG de alta
 * qualidade, a foto fica com algumas centenas de KB e continua nítida em
 * qualquer tela de celular e no visualizador em tela cheia.
 */

/** Lado maior da foto enviada, em pixels. */
export const MAX_PHOTO_DIMENSION = 2048

/** Qualidade do JPEG gerado (0–1). Alta o bastante para não aparecer artefato. */
export const PHOTO_QUALITY = 0.85


/**
 * Formatos que não passam pela redução. PNG pode ter transparência (foto de
 * referência recortada) e JPEG não tem; GIF e SVG perderiam animação/vetor.
 */
const KEEP_AS_IS = new Set(['image/png', 'image/gif', 'image/svg+xml'])

/** Calcula o tamanho final mantendo a proporção. Nunca amplia. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const maior = Math.max(width, height)
  if (maior <= max) return { width, height }
  const escala = max / maior
  return { width: Math.round(width * escala), height: Math.round(height * escala) }
}

/**
 * Devolve a foto reduzida, ou a original quando reduzir não compensa ou não é
 * possível (formato que o navegador não decodifica, como HEIC no Chrome, ou
 * navegador antigo). Nunca falha: no pior caso o envio segue como antes.
 */
export async function compressPhoto(file: File): Promise<File> {
  // Toda foto passa pelo canvas, mesmo a pequena: regravar é o que apaga os
  // metadados da câmera — inclusive a posição GPS exata, que vazaria o ponto
  // certinho de quem escolheu "localização aproximada" na privacidade.
  if (KEEP_AS_IS.has(file.type)) return file
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  try {
    // Os navegadores atuais já aplicam a orientação do EXIF aqui, então a
    // foto tirada em pé não sai deitada.
    const bitmap = await createImageBitmap(file)
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_DIMENSION)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY)
    )
    if (!blob) return file

    const nome = file.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([blob], `${nome}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
