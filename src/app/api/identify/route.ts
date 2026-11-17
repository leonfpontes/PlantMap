import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchSuggestions, type IdentifySuggestion, type PlantNetResult } from '@/lib/plantId'

/**
 * Identificação de planta pela foto (Pl@ntNet), usada no cadastro.
 *
 * Roda no servidor: a chave não vai para o celular, e o aparelho só manda a
 * foto já reduzida — nada de modelo de IA pesando no telefone. Exige login,
 * porque a cota gratuita do Pl@ntNet é limitada por dia.
 */
const PLANTNET_URL = 'https://my-api.plantnet.org/v2/identify/all'
const TIMEOUT_MS = 20_000

export async function POST(request: Request) {
  const key = process.env.PLANTNET_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Identificação indisponível no momento.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Entre na sua conta para identificar plantas.' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  const image = form?.get('image')
  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: 'Envie uma foto da planta.' }, { status: 400 })
  }
  // O Pl@ntNet só aceita JPEG e PNG. O app reduz a foto para JPEG antes de
  // mandar; HEIC que o navegador não converteu cai aqui com uma mensagem clara.
  if (image.type !== 'image/jpeg' && image.type !== 'image/png') {
    return NextResponse.json({ error: 'Este formato de foto não pode ser identificado. Escolha a espécie na lista.' }, { status: 415 })
  }

  const body = new FormData()
  body.append('images', image, image.type === 'image/png' ? 'foto.png' : 'foto.jpg')
  body.append('organs', 'auto')

  const url = `${PLANTNET_URL}?include-related-images=false&no-reject=false&nb-results=8&lang=pt&api-key=${encodeURIComponent(key)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let results: PlantNetResult[] = []
  try {
    const res = await fetch(url, { method: 'POST', body, signal: controller.signal })
    // 404 do Pl@ntNet = "nenhuma espécie reconhecida" (foto sem planta, borrada...).
    if (res.status === 404) return NextResponse.json({ suggestions: [] })
    if (res.status === 429) {
      return NextResponse.json({ error: 'Limite diário de identificações atingido. Escolha a espécie na lista.' }, { status: 429 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Não foi possível identificar agora. Escolha a espécie na lista.' }, { status: 502 })
    }
    const data = (await res.json()) as { results?: PlantNetResult[] }
    results = data.results ?? []
  } catch {
    return NextResponse.json({ error: 'A identificação demorou demais. Escolha a espécie na lista.' }, { status: 504 })
  } finally {
    clearTimeout(timer)
  }

  const { data: catalog } = await supabase
    .from('species')
    .select('id, common_name, scientific_name, image_url, status')
    .eq('status', 'approved')
    .not('scientific_name', 'is', null)

  const suggestions: IdentifySuggestion[] = matchSuggestions(results, catalog ?? [])
  return NextResponse.json({ suggestions })
}
