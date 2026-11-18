/**
 * Carregador de imagens do app (next.config: images.loader = 'custom').
 *
 * Substitui o otimizador da Vercel, cuja cota gratuita acabou: com ela
 * esgotada, toda imagem que não estava em cache voltava com erro 402 e
 * aparecia quebrada. Agora nenhuma imagem passa pela Vercel:
 *
 *  - Wikimedia Commons (fotos de referência do catálogo): usa as miniaturas
 *    do próprio Wikimedia, de graça, nos tamanhos padrão que ele aceita. O
 *    banco guarda no máximo a miniatura de 960 px — e o original quando ele
 *    é menor que isso, porque o Wikimedia recusa miniatura maior que a foto.
 *  - O resto (fotos do Supabase, de 0,5 a 7 MB cada): passa pelo wsrv.nl,
 *    serviço aberto que reduz e guarda em cache (Cloudflare). Ele também
 *    remove os metadados da foto, como a posição de GPS gravada pela câmera.
 */

/** Tamanhos que o Wikimedia serve; outros voltam com erro 400/429. */
export const WIKIMEDIA_WIDTHS = [120, 250, 330, 500, 960] as const

const WIKIMEDIA_HOST = 'upload.wikimedia.org'
const WSRV = 'https://wsrv.nl/'

/** Menor tamanho padrão que cobre a largura pedida, sem passar do teto. */
function wikimediaWidth(requested: number, max: number): number {
  const ok = WIKIMEDIA_WIDTHS.filter((w) => w <= max)
  if (ok.length === 0) return max
  return ok.find((w) => w >= requested) ?? ok[ok.length - 1]
}

/**
 * Reescreve a URL de miniatura do Wikimedia para outro tamanho padrão.
 * Formato: /wikipedia/commons/thumb/a/ab/Nome.jpg/960px-Nome.jpg
 */
function resizeWikimedia(url: URL, requested: number): string {
  const m = url.pathname.match(/^(\/wikipedia\/commons\/thumb\/[^/]+\/[^/]+\/[^/]+)\/(\d+)px-(.+)$/)
  if (!m) return url.toString() // original pequeno (já é leve) ou formato inesperado
  const [, prefixo, atual, resto] = m
  const largura = wikimediaWidth(requested, Number(atual))
  return `https://${WIKIMEDIA_HOST}${prefixo}/${largura}px-${resto}`
}

export function imageUrl(src: string, width: number, quality = 70): string {
  if (!src || src.startsWith('/') || src.startsWith('blob:') || src.startsWith('data:')) return src

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return src
  }

  if (url.hostname === WIKIMEDIA_HOST) return resizeWikimedia(url, width)

  // &we: não amplia foto pequena; &n=-1: GIF animado continua animado.
  const params = new URLSearchParams({ url: src, w: String(width), q: String(quality), we: '', n: '-1' })
  return `${WSRV}?${params.toString().replace(/=(&|$)/g, '$1')}`
}

/** Assinatura que o next/image espera do carregador customizado. */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  return imageUrl(src, width, quality ?? 70)
}
